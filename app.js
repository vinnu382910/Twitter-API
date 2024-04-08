const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const authenticationToken = (request, response, next) => {
  const {tweet} = request.body
  const {tweetId} = request.params
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
    console.log(jwtToken)
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.payload = payload
        request.tweetId = tweetId
        request.tweet = tweet
        next()
      }
    })
  }
}

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(getUserQuery)
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `
                INSERT INTO 
                  user (username, name, password, gender) 
                VALUES 
                  (
                    '${username}',  
                    '${name}',
                    '${hashedPassword}',
                    '${gender}'
                  );`
      await db.run(createUserQuery)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})
//2
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(getUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//3

app.get(
  '/user/tweets/feed/',
  authenticationToken,
  async (request, response) => {
    const {payload} = request
    const {user_id, name, username, gender} = payload
    console.log(user_id)
    console.log(username)
    const getTweetsQuery = `SELECT * FROM follower INNER JOIN user ON user.user_id = follower.following_user_id;`
    const tweetArr = await db.all(getTweetsQuery)
    response.send(tweetArr)
  },
)

//4

app.get('/user/following/', authenticationToken, async (request, response) => {
  const {user_id, name, username, gender} = payload
  const getUserQuery = `SELECT username FROM follower INNER JOIN user.user_id = follower.following_user_id WHERE follower.follower_user_id = ${user_id}`
  const userFollowersArr = db.all(getUserQuery)
  response.send(userFollowersArr)
})

module.exports = app
