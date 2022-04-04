const { Appsignal } = require("@appsignal/nodejs");

const appsignal = new Appsignal({
  active: true,
  name: "prisma",
  pushApiKey: "PUSH-API-KEY",
  logPath: "logs",
  logLevel: "trace",
});

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  expressMiddleware,
  expressErrorHandler,
} = require("@appsignal/express");
const prisma = new PrismaClient();
const app = express();
const port = 3000;

// ADD THIS AFTER ANY OTHER EXPRESS MIDDLEWARE, BUT BEFORE ANY ROUTES!
app.use(expressMiddleware(appsignal));

app.get("/", (req, res) => {
  const tracer = appsignal.tracer();
  tracer.withSpan(tracer.createSpan(), async (span) => {
    // the span returned by `tracer.createSpan()` now has a Scope
    // it will be the next span to be returned by `tracer.currentSpan()`!
    getUsers()
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  });

  res.send("Hello World!");
});

// POST method route
app.post("/post", (req, res) => {
  const tracer = appsignal.tracer();
  tracer.withSpan(tracer.createSpan(), async (span) => {
    getUsers()
      .catch((e) => {
        throw e;
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  });
  res.send("POST request");
});
// ADD THIS AFTER ANY OTHER EXPRESS MIDDLEWARE, AND AFTER ANY ROUTES!
app.use(expressErrorHandler(appsignal));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

prisma.$use(async (params, next) => {
  const tracer = appsignal.tracer();
  const span = tracer.currentSpan();

  const result = await next(params);
  const startTime = new Date();

  span.setName(`Query.sql.${params.model}.${params.action}`);
  span.setCategory(`sql.${params.action}`);
  const endTime = new Date();
  const took = endTime.getTime() - startTime.getTime(); // in ms
  console.log(`Query-${params.model}.${params.action}- took - ${took} -ms`);
  span.close();
  return result;
});

// A `main` function so that you can use async/await
async function getUsers() {
  const tracer = appsignal.tracer();

  tracer.withSpan(tracer.currentSpan(), async (span) => {
    // `span` is the same span created by `tracer.createSpan()` in the example above!
    span.setName(`Method call`);
    span.setCategory(`getUsers`);

    await tracer.withSpan(span.child(), async (child) => {
      const allUsers = await prisma.user.findMany({
        include: { posts: true },
      });
      console.dir(allUsers, { depth: null });
      child.close();
      return allUsers;
    });
    span.close();
  });
}
