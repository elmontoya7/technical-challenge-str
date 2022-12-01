# technical-challenge-str
This challenge was solved with a Node.js project. It can run locally or in a Docker container.
## docker-compose

```bash
# compose
$ docker-compose build

# start
$ docker-compose up

```

The project has a web version that can be accessed on http://localhost:300 once the images are up and running.

## env
The project requires a Sendgrid API Key. The env file was attached in the contact email.
```
SENDGRID_KEY=<sendgrid api key to send emails>
```
