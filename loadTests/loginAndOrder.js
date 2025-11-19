import { sleep, check, group, fail } from "k6";
import http from "k6/http";

export const options = {
  cloud: {
    distribution: { "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: "ramping-vus",
      gracefulStop: "30s",
      stages: [
        { target: 5, duration: "30s" },
        { target: 15, duration: "1m" },
        { target: 10, duration: "30s" },
        { target: 0, duration: "30s" },
      ],
      gracefulRampDown: "30s",
      exec: "scenario_1",
    },
  },
};

export function scenario_1() {
  const vars = {};
  let response;

  group("page_1 - https://pizza.germanrl.click/", function () {
    response = http.put(
      "https://pizza-service.germanrl.click/api/auth",
      '{"email":"t@jwt.com","password":"test"}',
      {
        headers: {
          Host: "pizza-service.germanrl.click",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          Origin: "https://pizza.germanrl.click",
          "Sec-GPC": "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      }
    );
    if (
      !check(response, { "status equals 200": (response) => response.status.toString() === "200" })
    ) {
      console.log(response.body);
      fail("Login request status code was *not* 200");
    }
    vars.authToken = response.json().token;
    sleep(4.4);

    response = http.get("https://pizza-service.germanrl.click/api/order/menu", {
      headers: {
        Host: "pizza-service.germanrl.click",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        Authorization: `Bearer ${vars.authToken}`,
        Origin: "https://pizza.germanrl.click",
        "Sec-GPC": "1",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
    });

    response = http.get(
      "https://pizza-service.germanrl.click/api/franchise?page=0&limit=20&name=*",
      {
        headers: {
          Host: "pizza-service.germanrl.click",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          Authorization: `Bearer ${vars.authToken}`,
          Origin: "https://pizza.germanrl.click",
          "Sec-GPC": "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      }
    );
    sleep(6.5);

    response = http.get("https://pizza-service.germanrl.click/api/user/me", {
      headers: {
        Host: "pizza-service.germanrl.click",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        Authorization: `Bearer ${vars.authToken}`,
        Origin: "https://pizza.germanrl.click",
        "Sec-GPC": "1",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
    });
    sleep(2.3);

    response = http.post(
      "https://pizza-service.germanrl.click/api/order",
      '{"items":[{"menuId":3,"description":"Margarita","price":0.0042}],"storeId":"1","franchiseId":1}',
      {
        headers: {
          Host: "pizza-service.germanrl.click",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          Authorization: `Bearer ${vars.authToken}`,
          Origin: "https://pizza.germanrl.click",
          "Sec-GPC": "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      }
    );
    if (
      !check(response, { "status equals 200": (response) => response.status.toString() === "200" })
    ) {
      console.log(response.body);
      fail("Purchase request status code was *not* 200");
    }
    vars.jwt = response.json().jwt;
    sleep(2.5);

    response = http.post(
      "https://pizza-factory.cs329.click/api/order/verify",
      `{"jwt":"${vars.jwt}"}`,
      {
        headers: {
          Host: "pizza-factory.cs329.click",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          Authorization: `Bearer ${vars.authToken}`,
          Origin: "https://pizza.germanrl.click",
          "Sec-GPC": "1",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
        },
      }
    );
  });
}
