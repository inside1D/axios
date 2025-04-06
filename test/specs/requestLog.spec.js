import Axios from "../../lib/core/Axios";

describe("Axios Request Logging Functions", function () {
  let axios;

  beforeEach(function () {
    axios = new Axios({});
    jasmine.Ajax.install();
  });

  afterEach(function () {
    jasmine.Ajax.uninstall();
  });

  describe("enable_request_logging", function () {
    it("should initialize the log and use an interceptor for the first call on an axios instance", function () {
      const useSpy = spyOn(
        axios.interceptors.response,
        "use"
      ).and.callThrough();

      axios.enable_request_logging();
      expect(axios.log.length).toBe(0);
      expect(axios.logInterceptorID).toBe(0);
      expect(useSpy.calls.count()).toBe(1);
    });

    it("should not add any interceptor if a log is initalized already", function () {
      const useSpy = spyOn(
        axios.interceptors.response,
        "use"
      ).and.callThrough();
      // simulate when log is initialized and an interceptor has been added
      axios.log = [];
      axios.logInterceptorID = 1;
      axios.enable_request_logging();
      expect(useSpy.calls.count()).toBe(0);
    });

    it("should add one request interceptor only, despite multiple calls", function () {
      const useSpy = spyOn(
        axios.interceptors.response,
        "use"
      ).and.callThrough();
      axios.enable_request_logging();
      axios.enable_request_logging();
      axios.enable_request_logging();
      expect(useSpy.calls.count()).toBe(1);
    });

    it("should log request when a request is intercepted (happy path, single)", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/test").andReturn({
        status: 200,
      });

      await axios.get("/test");

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
      ]);
    });

    it("should log each request in order when multiple requests are intercepted (happy path, multiple)", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/test").andReturn({
        status: 200,
      });

      jasmine.Ajax.stubRequest("/anotherTest").andReturn({
        status: 201,
      });

      await axios.get("/test");
      await axios.put("/test");
      await axios.post("/anotherTest");

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/test",
          status: 200,
        },
        {
          method: "POST",
          url: "/anotherTest",
          status: 201,
        },
      ]);
    });

    it("should log a request when the server responds with an error (unhappy path, single)", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/not-found").andError({
        status: 404,
      });

      try {
        await axios.get("/not-found");
      } catch (err) {
        // Intentionally silenced for testing
      }

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/not-found",
          status: 404,
        },
      ]);
    });

    it("should log multiple requests in order when the server responds with errors (unhappy path, multiple)", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/not-found").andError({
        status: 404,
      });

      jasmine.Ajax.stubRequest("/server-error").andError({
        status: 501,
      });

      try {
        await axios.get("/not-found");
      } catch (err) {
        // Intentionally silenced for testing
      }

      try {
        await axios.put("/server-error");
      } catch (err) {
        // Intentionally silenced for testing
      }

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/not-found",
          status: 404,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
      ]);
    });

    it("should log multiple requests in order regardless of their nature (mixture of happy and unhappy paths)", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/client-side-error").andError({
        status: 401,
      });

      jasmine.Ajax.stubRequest("/good-path").andReturn({
        status: 200,
      });

      jasmine.Ajax.stubRequest("/server-error").andError({
        status: 501,
      });

      jasmine.Ajax.stubRequest("/server-error-two").andError({
        status: 505,
      });

      try {
        await axios.get("/client-side-error");
      } catch (err) {
        // Intentionally silenced for testing
      }

      await axios.post("/good-path");
      await axios.get("/good-path");

      try {
        await axios.put("/server-error");
      } catch (err) {
        // Intentionally silenced for testing
      }

      try {
        await axios.delete("/server-error-two");
      } catch (err) {
        // Intentionally silenced for testing
      }

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/client-side-error",
          status: 401,
        },
        {
          method: "POST",
          url: "/good-path",
          status: 200,
        },
        {
          method: "GET",
          url: "/good-path",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
        {
          method: "DELETE",
          url: "/server-error-two",
          status: 505,
        },
      ]);
    });
  });

  describe("disable_request_logging", function () {
    it("should eject the request interceptor when logging is disabled", function () {
      axios.enable_request_logging();
      const ejectSpy = spyOn(
        axios.interceptors.response,
        "eject"
      ).and.callThrough();

      axios.disable_request_logging();

      // assert.strictEqual(ejectSpy.callCount, 1);
      expect(ejectSpy.calls.count()).toBe(1);
    });

    it("should not eject anything if logging is not enabled", function () {
      const ejectSpy = spyOn(
        axios.interceptors.response,
        "eject"
      ).and.callThrough();

      axios.disable_request_logging();

      // assert.strictEqual(ejectSpy.callCount, 0);
      expect(ejectSpy.calls.count()).toBe(0);
    });

    it("should stop logging responses after disable is called", async function () {
      axios.enable_request_logging();
      jasmine.Ajax.stubRequest("/test").andReturn({
        status: 200,
      });

      jasmine.Ajax.stubRequest("/server-error").andError({
        status: 501,
      });

      // Requests that should be logged
      await axios.get("/test");

      try {
        await axios.put("/server-error");
      } catch (err) {
        // Intentionally silenced for testing
      }

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
      ]);
      // Disable
      axios.disable_request_logging();

      jasmine.Ajax.stubRequest("/should-not-be-logged").andReturn({
        status: 201,
      });

      await axios.get("/should-not-be-logged");

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
      ]);
    });

    
    it("should continue to populate the log after the log is disabled and enabled again", async function () {
      axios.enable_request_logging();
      jasmine.Ajax.stubRequest("/test").andReturn({
        status: 200,
      });

      jasmine.Ajax.stubRequest("/server-error").andError({
        status: 501,
      });

      // Requests that should be logged
      await axios.get("/test");

      try {
        await axios.put("/server-error");
      } catch (err) {
        // Intentionally silenced for testing
      }

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
      ]);
      // Disable
      axios.disable_request_logging();

      jasmine.Ajax.stubRequest("/should-not-be-logged").andReturn({
        status: 201,
      });

      await axios.get("/should-not-be-logged");

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
      ]);

      // Enable again, the interceptor should be populating the log again.
      axios.enable_request_logging();

      await axios.post("/test");
      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/test",
          status: 200,
        },
        {
          method: "PUT",
          url: "/server-error",
          status: 501,
        },
        {
          method: "POST",
          url: "/test",
          status: 200,
        }
      ]);

    });
  });

  describe("get_request_log", function () {
    it("should return an empty log if the log field has not been initialized", function () {
      const actual = axios.get_request_log();
      expect(actual.length).toBe(0);
    });

    it("should return an empty log if the log field gets initialized but not populated", function () {
      axios.enable_request_logging();
      const actual = axios.get_request_log();
      expect(actual.length).toBe(0);
    });

    it("should be able to return a log with one entry", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/one-entry").andReturn({
        status: 200,
      });

      await axios.get("/one-entry");

      expect(axios.get_request_log()).toEqual([
        {
          method: "GET",
          url: "/one-entry",
          status: 200,
        },
      ]);
    });

    it("should be able to return a log with multiple entries", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/multi-entry").andReturn({
        status: 200,
      });

      await axios.get("/multi-entry");
      await axios.post("/multi-entry");
      await axios.delete("/multi-entry");

      expect(axios.get_request_log()).toEqual([
        {
          method: "GET",
          url: "/multi-entry",
          status: 200,
        },
        {
          method: "POST",
          url: "/multi-entry",
          status: 200,
        },
        {
          method: "DELETE",
          url: "/multi-entry",
          status: 200,
        },
      ]);
    });
  });

  describe("clear_request_log", function () {
    it("should do nothing if the log is not initialized", function () {
      axios.clear_request_log();
      // We check by making sure it does not initalize things (e.g. turning them to things like null or [])
      expect(axios.log).toBe(undefined);
      expect(axios.logInterceptorID).toBe(undefined);
    });

    it("should empty the log if the log is initialized but contains no entry", function () {
      axios.enable_request_logging();
      expect(axios.log.length).toBe(0);
      axios.clear_request_log();
      expect(axios.log.length).toBe(0);
    });

    it("should empty the log if the log has been populated", async function () {
      axios.enable_request_logging();
      jasmine.Ajax.stubRequest("/should-disappear").andReturn({
        status: 205
      });

      jasmine.Ajax.stubRequest("/should-disappear-two").andError({
        status: 501
      });

      try {
        await axios.get("/should-disappear-two");
      } catch (err) {
        // silenced intentionally for testing
      }

      await axios.put("/should-disappear");
      await axios.get("/should-disappear");
      // Assure the log has been populated before clearing
      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/should-disappear-two",
          status: 501,
        },
        {
          method: "PUT",
          url: "/should-disappear",
          status: 205,
        },
        {
          method: "GET",
          url: "/should-disappear",
          status: 205,
        },
      ]);

      axios.clear_request_log();
      expect(axios.log.length).toBe(0);
    });

    it("should allow the log to be populated again after clearing it", async function () {
      axios.enable_request_logging();

      jasmine.Ajax.stubRequest("/to-clear").andReturn({
        status: 201,
      });

      jasmine.Ajax.stubRequest("/to-stay-one").andReturn({
        status: 205,
      });

      jasmine.Ajax.stubRequest("/to-stay-two").andError({
        status: 403,
      });

      await axios.get("/to-clear");
      await axios.post("/to-clear");

      expect(axios.log).toEqual([
        {
          method: "GET",
          url: "/to-clear",
          status: 201,
        },
        {
          method: "POST",
          url: "/to-clear",
          status: 201,
        }
      ])

      // Clear the log and restart populating it
      axios.clear_request_log();

      await axios.post("/to-stay-one");
      try {
        await axios.put("/to-stay-two");
      } catch (err) {
        // silenced intentionally for testing
      }

      expect(axios.log).toEqual([
        {
          method: "POST",
          url: "/to-stay-one",
          status: 205,
        },
        {
          method: "PUT",
          url: "/to-stay-two",
          status: 403,
        }
      ])
      
    });
  });
});
