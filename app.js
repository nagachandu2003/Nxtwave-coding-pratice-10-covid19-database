const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;
const app = express();
app.use(express.json());

const initializeDBAndServer = async (request, response) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateUser = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) jwtToken = authHeader.split(" ")[1];
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "kshdfuwbdkfhsfhgks", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * from user where username = '${username}'`;
  let dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (isPasswordValid === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "kshdfuwbdkfhsfhgks");
      response.send({
        jwtToken: jwtToken,
      });
    }
  }
});

// API 2
app.get("/states/", authenticateUser, async (request, response) => {
  const getStatesQuery = `SELECT * from state;`;
  const fun = (arg) => {
    return {
      stateId: arg.state_id,
      stateName: arg.state_name,
      population: arg.population,
    };
  };
  const res2 = await db.all(getStatesQuery);
  response.send(res2.map((ele) => fun(ele)));
});

//API 3
app.get("/states/:stateId/", authenticateUser, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * from state WHERE state_id = ${stateId};`;
  const res3 = await db.get(getStateQuery);
  response.send({
    stateId: res3.state_id,
    stateName: res3.state_name,
    population: res3.population,
  });
});

//API 4
app.post("/districts/", authenticateUser, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
        );`;
  const res4 = await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//API 5
app.get(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT * from district where district_id = ${districtId};`;
    const res5 = await db.get(getDistrictQuery);
    response.send({
      districtId: res5.district_id,
      districtName: res5.district_name,
      stateId: res5.state_id,
      cases: res5.cases,
      cured: res5.cured,
      active: res5.active,
      deaths: res5.deaths,
    });
  }
);

//API 6
app.delete(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE FROM
    district
    WHERE
    district_id = ${districtId};`;
    const res6 = await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//API 7
app.put(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
    UPDATE
    district
    SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
    const res7 = await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//API 8
app.get(
  "/states/:stateId/stats/",
  authenticateUser,
  async (request, response) => {
    const { stateId } = request.params;
    const getStatsQuery = `
    SELECT
    sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    FROM
    state inner join district on
    state.state_id = district.state_id
    WHERE
    state.state_id = ${stateId};`;
    const res8 = await db.get(getStatsQuery);
    response.send(res8);
  }
);

module.exports = app;
