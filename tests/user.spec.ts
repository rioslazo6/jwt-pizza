import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { User, Role } from "../src/service/pizzaService";

async function setupPage(page: Page) {
  let loggedInUser: User | undefined;
  let newUserId = 100;

  const validUsers: Record<number, User> = {
    1: {
      id: "1",
      name: "Ad Min",
      email: "a@jwt.com",
      password: "a",
      roles: [{ role: Role.Admin }],
    },
    2: {
      id: "2",
      name: "Di Ner",
      email: "d@jwt.com",
      password: "d",
      roles: [{ role: Role.Diner }],
    },
    3: {
      id: "3",
      name: "Fran Chisee",
      email: "f@jwt.com",
      password: "f",
      roles: [{ role: Role.Franchisee }],
    },
  };

  function getUserByEmail(email: string): User | undefined {
    return Object.values(validUsers).find((user) => user.email === email);
  }

  // Login, register, and logout for the given user
  await page.route("*/**/api/auth", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "PUT") {
      const loginReq = route.request().postDataJSON();
      const user = getUserByEmail(loginReq.email);
      if (!user || user.password !== loginReq.password) {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
        return;
      }
      loggedInUser = validUsers[parseInt(user?.id ?? "")];
      const loginRes = {
        user: loggedInUser,
        token: "abcdef",
      };
      return await route.fulfill({ json: loginRes });
    } else if (method === "POST") {
      const registerReq = route.request().postDataJSON();
      const newUser = {
        id: newUserId.toString(),
        name: registerReq.name,
        email: registerReq.email,
        password: registerReq.password,
        roles: [{ role: Role.Diner }],
      };
      validUsers[newUserId] = newUser;
      newUserId++;
      const registerRes = {
        user: newUser,
        token: "abcdef",
      };
      return await route.fulfill({ json: registerRes });
    } else if (method === "DELETE") {
      const logoutRes = {
        message: "logout succesful",
      };
      return await route.fulfill({ json: logoutRes });
    }
    return await route.fallback();
  });

  // Return the currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  await page.route("**/api/user/*", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "PUT") {
      const updateReq = req.postDataJSON();
      const id = updateReq.id;
      const newName = updateReq.name;
      const newPassword = updateReq.password;
      const newEmail = updateReq.email;

      if (newName) validUsers[id].name = newName;
      if (newPassword) validUsers[id].password = newPassword;
      if (newEmail) validUsers[id].email = newEmail;

      const updateRes = {
        user: validUsers[id],
        token: "abcdef",
      };
      return await route.fulfill({ json: updateRes });
    }
    return await route.fallback();
  });

  await page.route("**/api/user*", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "GET") {
      const url = new URL(req.url());
      const nameFilter = (url.searchParams.get("name") ?? "*")
        .replace(/\*/g, "")
        .trim()
        .toLowerCase();
      const userList = Object.values(validUsers);
      const users = !!nameFilter
        ? userList.filter((user) => user.name?.toLowerCase().includes(nameFilter))
        : userList;
      const getUsersRes = {
        users,
        more: false,
      };
      return await route.fulfill({ json: getUsersRes });
    }
    return await route.fallback();
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "GET") {
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
      return await route.fulfill({ json: franchiseRes });
    }
    return await route.fallback();
  });

  await page.goto("/");
}

test("update diner name", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await setupPage(page);
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

test("update franchisee name", async ({ page }) => {
  const newName = `franchisee${Math.floor(Math.random() * 10000)}`;
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("f");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole("main")).not.toContainText(newName);

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill(newName);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newName);

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("f");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();

  await expect(page.getByRole("main")).toContainText(newName);
});

test("update admin name", async ({ page }) => {
  const newName = `admin${Math.floor(Math.random() * 10000)}`;
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole("main")).not.toContainText(newName);

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill(newName);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newName);

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();

  await expect(page.getByRole("main")).toContainText(newName);
});

test("update diner credentials", async ({ page }) => {
  const newEmail = `diner${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newPassword = `password${Math.floor(Math.random() * 10000)}`;
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("d");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole("main")).toContainText("Di Ner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator('input[type="email"]').fill(newEmail);
  await page.locator("#password").fill(newPassword);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newEmail);

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(newEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(newPassword);
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();

  await expect(page.getByRole("main")).toContainText("Di Ner");
});

test("update franchisee credentials", async ({ page }) => {
  const newEmail = `franchisee${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newPassword = `password${Math.floor(Math.random() * 10000)}`;
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("f");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole("main")).toContainText("Fran Chisee");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator('input[type="email"]').fill(newEmail);
  await page.locator("#password").fill(newPassword);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newEmail);

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(newEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(newPassword);
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();

  await expect(page.getByRole("main")).toContainText("Fran Chisee");
});

test("update admin credentials", async ({ page }) => {
  const newEmail = `admin${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newPassword = `password${Math.floor(Math.random() * 10000)}`;
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();
  await expect(page.getByRole("main")).toContainText("Ad Min");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator('input[type="email"]').fill(newEmail);
  await page.locator("#password").fill(newPassword);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText(newEmail);

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(newEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(newPassword);
  await page.getByRole("button", { name: "Login" }).click();

  await page.locator('a[href="/diner-dashboard"]').click();

  await expect(page.getByRole("main")).toContainText("Ad Min");
});

test("see and filter user list", async ({ page }) => {
  await setupPage(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("main")).toContainText("Users");
  await expect(page.getByRole("main")).toContainText("Ad Min");
  await expect(page.getByRole("main")).toContainText("Di Ner");
  await expect(page.getByRole("main")).toContainText("Fran Chisee");

  await page.getByRole("textbox", { name: "Filter users" }).click();
  await page.getByRole("textbox", { name: "Filter users" }).fill("min");
  await page.getByRole("cell", { name: "Submit" }).getByRole("button").first().click();
  await expect(page.getByRole("main")).toContainText("Ad Min");
  await expect(page.getByRole("main")).not.toContainText("Di Ner");
  await expect(page.getByRole("main")).not.toContainText("Fran Chisee");
});
