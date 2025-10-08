import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";

test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    "d@jwt.com": {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      password: "a",
      roles: [{ role: Role.Diner }],
    },
    "a@jwt.com": {
      id: "2",
      name: "Min Ad",
      email: "a@jwt.com",
      password: "z",
      roles: [{ role: Role.Admin }],
    },
    "f@jwt.com": {
      id: "4",
      name: "Fran Chise",
      email: "f@jwt.com",
      password: "g",
      roles: [{ role: Role.Franchisee }],
    },
  };

  // Login, register, and logout for the given user
  await page.route("*/**/api/auth", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "PUT") {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];
      if (!user || user.password !== loginReq.password) {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
        return;
      }
      loggedInUser = validUsers[loginReq.email];
      const loginRes = {
        user: loggedInUser,
        token: "abcdef",
      };
      expect(route.request().method()).toBe("PUT");
      return await route.fulfill({ json: loginRes });
    } else if (method === "POST") {
      const registerReq = route.request().postDataJSON();
      const registerRes = {
        user: { id: 8, name: registerReq.name, email: registerReq.email },
        token: "abcdef",
      };
      return await route.fulfill({ json: registerRes });
    } else if (method === "DELETE") {
      const logoutRes = {
        message: "logout succesful",
      };
      expect(method).toBe("DELETE");
      return await route.fulfill({ json: logoutRes });
    }
    return await route.fallback();
  });

  // Return the currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // A standard menu
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  // Standard franchises and stores
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "POST") {
      const franchiseReq = req.postDataJSON();
      const franchiseRes = {
        order: { ...franchiseReq, id: 35 },
        jwt: "eyJpYXQ",
      };
      expect(method).toBe("POST");
      return await route.fulfill({ json: franchiseRes });
    } else if (method === "GET") {
      const franchiseRes = {
        franchises: [
          {
            id: 2,
            name: "LotaPizza",
            stores: [
              { id: 4, name: "Lehi" },
              { id: 5, name: "Springville" },
              { id: 6, name: "American Fork" },
            ],
          },
          { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
          { id: 4, name: "topSpot", stores: [] },
        ],
      };
      expect(method).toBe("GET");
      return await route.fulfill({ json: franchiseRes });
    }
    return await route.fallback();
  });

  // Get franchises for user id
  await page.route("**/api/franchise/*", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "GET") {
      const franchiseRes = [
        { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
      ];
      expect(method).toBe("GET");
      return await route.fulfill({ json: franchiseRes });
    }
    return await route.fallback();
  });

  // Create store
  await page.route("**/api/franchise/*/store", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "POST") {
      const storeReq = req.postDataJSON();
      const storeRes = {
        store: { ...storeReq, id: 31 },
        jwt: "eyJpYXQ",
      };
      expect(method).toBe("POST");
      return await route.fulfill({ json: storeRes });
    }
    return await route.fallback();
  });

  // Delete store
  await page.route("**/api/franchise/*/store/*", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "DELETE") {
      const storeRes = {
        message: "store deleted",
      };
      expect(method).toBe("DELETE");
      return await route.fulfill({ json: storeRes });
    }
    return await route.fallback();
  });

  // Order a pizza.
  await page.route("*/**/api/order", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "POST") {
      const orderReq = req.postDataJSON();
      const orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: "eyJpYXQ",
      };
      expect(method).toBe("POST");
      return await route.fulfill({ json: orderRes });
    } else if (method === "GET") {
      const ordersRes = {
        dinerId: 3,
        orders: [
          {
            id: 1,
            franchiseId: 2,
            storeId: 6,
            date: "2025-10-07T20:24:47.000Z",
            items: [{ id: 1, menuId: 1, description: "Veggie", price: 0.0038 }],
          },
          {
            id: 2,
            franchiseId: 3,
            storeId: 7,
            date: "2025-10-07T20:27:25.000Z",
            items: [{ id: 2, menuId: 2, description: "Pepperoni", price: 0.0042 }],
          },
        ],
        page: 1,
      };
      expect(method).toBe("GET");
      return await route.fulfill({ json: ordersRes });
    }
    return await route.fallback();
  });

  await page.goto("/");
}

test("register", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("New User");
  await page.getByRole("textbox", { name: "Email address" }).fill("new@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("m");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "NU" })).toBeVisible();
});

test("login", async ({ page }) => {
  await basicInit(page);
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
});

test("login with wrong credentials", async ({ page }) => {
  await basicInit(page);
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("wrongpassword");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("main")).toContainText('"code":401'); // Unauthorized
});

test("logout", async ({ page }) => {
  await basicInit(page);
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
  await page.getByRole("link", { name: "Logout" }).click();

  await page.waitForTimeout(2000); // Wait 2 seconds to finish logging out
  await expect(page.getByRole("main")).toContainText("The web's best pizza");
});

test("about and history pages", async ({ page }) => {
  await basicInit(page);
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("main")).toContainText("The secret sauce");
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Rucci, my my");
});

test("purchase with login", async ({ page }) => {
  await basicInit(page);

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Pay
  await expect(page.getByRole("main")).toContainText("Send me those 2 pizzas right now!");
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();
});

test("diner dashboard", async ({ page }) => {
  await basicInit(page);

  // Login
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Go to dashboard
  await page.getByRole("link", { name: "KC" }).click();
  await expect(page.getByRole("main")).toContainText("Kai Chen");
  await expect(page.getByRole("main")).toContainText("d@jwt.com");
  await expect(page.getByRole("main")).toContainText("diner");

  // Order history is shown
  await expect(page.getByRole("main")).toContainText("Here is your history of all the good times.");
});

test("admin dashboard", async ({ page }) => {
  await basicInit(page);

  // Login as admin
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("z");
  await page.getByRole("button", { name: "Login" }).click();

  // Go to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.locator("h2")).toContainText("Mama Ricci's kitchen");
  await expect(page.locator("h3")).toContainText("Franchises");
  await expect(page.getByRole("button", { name: "Add Franchise" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("LotaPizza");
  await expect(page.getByRole("main")).toContainText("PizzaCorp");
  await expect(page.getByRole("main")).toContainText("topSpot");

  await page.getByPlaceholder("Filter franchises").fill("Corp");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("main")).toContainText("PizzaCorp");
});

test("franchise operations", async ({ page }) => {
  await basicInit(page);

  // Login as admin
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("z");
  await page.getByRole("button", { name: "Login" }).click();

  // Go to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Create franchise
  await page.getByRole("button", { name: "Add Franchise" }).click();
  await page.getByRole("textbox", { name: "franchise name" }).fill("Papa Tom");
  await page.getByRole("textbox", { name: "franchisee admin email" }).fill("a@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("h3")).toContainText("Franchises");

  // Close franchise
  await page.getByRole("button", { name: "Close" }).first().click(); // Close first franchise
  await expect(page.getByRole("heading")).toContainText("Sorry to see you go");
  await expect(page.getByRole("main")).toContainText("LotaPizza");
  await expect(page.getByRole("main")).toContainText("Close");
  await page.getByRole("button", { name: "Close" }).click();
});

test("franchise dashboard", async ({ page }) => {
  await basicInit(page);

  // Login
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("g");
  await page.getByRole("button", { name: "Login" }).click();

  // Go to franchise dashboard
  await page.getByRole("link", { name: "Franchise" }).first().click();
  await expect(page.getByRole("main")).toContainText("Your gateway to success");
  await expect(page.locator("h2")).toContainText("PizzaCorp");
});

test("store operations", async ({ page }) => {
  await basicInit(page);

  // Login
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("g");
  await page.getByRole("button", { name: "Login" }).click();

  // Go to franchise dashboard
  await page.getByRole("link", { name: "Franchise" }).first().click();

  // Create store
  await page.getByRole("button", { name: "Create store" }).click();
  await expect(page.locator("h2")).toContainText("Create store");
  await page.getByPlaceholder("store name").fill("Center Street");
  await page.getByRole("button", { name: "Create" }).click();

  // Close store
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading")).toContainText("Sorry to see you go");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("h2")).toContainText("PizzaCorp");
});
