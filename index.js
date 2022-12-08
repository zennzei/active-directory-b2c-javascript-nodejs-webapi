const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const {
  usage,
  jobs,
} = require("./generators");
const { faker } = require("@faker-js/faker");
const { getPaymentsInfo, generateToken, apiKey, wait, getAccount } = require("./helpers");
const fileUpload = require('express-fileupload');
const { add } = require("./generators/jobs");

let temp_apiKeys = Array.from({ length: 3 }).map(_ => apiKey());


const app = express();

app.use(express.json(
  {
    limit: '1gb',
    strict: false
  }
));

app.use(
  cors({
    origin: "*",
  })
);

app.use(morgan("dev"));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));


app.get(
  "/v1/accounts",
  async (req, res) => {
    // await wait(10);
    res.status(200).send(getAccount(temp_apiKeys));
    // res.status(200).json({ accounts: [] });
    // res.status(401).send();
    // res.status(500).send('error')
  }
);

app.post(
  "/v1/accounts",
  async (req, res) => {
    // await wait(3);
    res.status(200).send(getAccount(temp_apiKeys));
    // res.status(403).send();
  }
);


app.post(
  "/v1/api_keys",
  async (req, res) => {

    console.log("/api_keys");
    const apikeyId = generateToken();
    temp_apiKeys = [...temp_apiKeys, apiKey(apikeyId, req.body.name)];

    // await wait(200);

    res.status(200).send({
      apikey_id: apikeyId,
      key_value: faker.random.alpha(40),
    });
  }
);

app.delete(
  "/v1/api_keys/:api_key_id",
  (req, res) => {
    console.log("delete /api_keys", req.params.api_key_id);

    // res.status(404).send('error')


    temp_apiKeys = temp_apiKeys.filter(
      (key) => key.apikey_id != req.params.api_key_id
    );

    res.status(200).send({
      status: "ok",
    });
  }
);

app.get(
  "/v1/usage",
  (req, res) => {

    const sampleUsageData = usage.aggregate(req.query.since, req.query.until)
    res.status(200).send({ ...sampleUsageData });
  }
);



app.get("/v1/contracts/:contractId/payment_token", async (req, res) => {
  res.status(200).json({ payment_token: "payment_token" });

})

app.post("/v1/contracts/:contractId/cards", async (req, res) => {
  res.status(200).json({});
})

app.delete("/v1/contracts/:contractId/cards", async (req, res) => {
  res.status(403).json({});
})



app.get("/v1/payments", (req, res) => {
  // res.status(401).send("<html><body>unauthorized</body></html>")
  res.status(200).json({ ...getPaymentsInfo() });
  // res.status(500).text("error")
});


// API anonymous endpoint

app.get("/", (req, res) => res.send({ message: "hello", date: new Date(), date: process.env.TEST_ENV_VAR }));

app.post("/v1/jobs_key", (req, res) => {
  res.send({ key: "key" })
})

app.get("/v1/jobs", (req, res) => {
  /* res.send({
    jobs: []
  }) */
  res.send({
    jobs: jobs.list(req.query)
  })
})

app.post("/v1/jobs", async (req, res) => {

  /* await wait(5);
  res.status(400).send({
    "code": 400,
    "detail": "account is not allowed to create a job at the moment: This request would exceed your limit for Enhanced Model transcription in the current month. Your limit is 2 hours.",
    "error": "Forbidden"
  }) */

  try {
    const newId = jobs.add()
    // await wait(30);
    res.send({ id: newId })
  } catch (error) {
    res.status(error.status ? error.status : 500).send(error.message)
  }

  /* res.status(403).send({
    "code": 403,
    "detail": "account is not allowed to create a job at the moment: This request would exceed your limit for Enhanced Model transcription in the current month. Your limit is 2 hours.",
    "error": "Forbidden"
  }) */
})

app.get("/v1/jobs/:jobId", (req, res) => {
  const job = jobs.getById(req.params.jobId)
  if (job == null) {
    res.status(404).send({ code: 404, message: "No job with id: " + req.params.jobId })
  } else {
    res.send({
      job
    })
  }
})

app.delete("/v1/jobs/:jobId", (req, res) => {
  res.status(404).send({ code: 404, message: "No job with id: " + req.params.jobId })
  /* try {
    jobs.deleteById(req.params.jobId)
    res.status(200).send({ id: req.params.jobId })
  } catch (error) {
    res.status(error.status ? error.status : 500).send(error.message)
  } */
})

app.get("/v1/jobs/:jobId/transcript", (req, res) => {
  const job = jobs.getById(req.params.jobId)
  if (job == null) {
    res.status(404).send({ code: 404, message: "No job with id: " + req.params.jobId })
  } else if (req.query.format === 'txt') {
    res.send(faker.lorem.paragraph(35))
  } else {
    res.send(jobs.jsonTranscript)
  }

})


const API_VERSION = "0.0.1"
// connectors debug 
app.post("/signUpConnector", (req, res) => {
  console.log("/signUpConnector", req);
  res.send({ version: API_VERSION, action: "Continue" });
});

app.post("/beforeCreatingUserConnector", async (req, res) => {

  console.log("/beforeCreatingUserConnector", req);
  res.send({ version: API_VERSION, action: "Continue" });

});

app.post("/beforeAppClaimsConnector", (req, res) => {
  console.log("/beforeAppClaimsConnector", req);
  res.send({ version: API_VERSION, action: "Continue" });
});



const port = process.env.PORT || 4444;

app.listen(port, () => {
  console.log("Listening on port " + port);
});