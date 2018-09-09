# Virgin Media Postcode Checker

Checks the Virgin Media website every day at 12pm to see if your house is available!

- AWS Lambda
- AWS SES
- Serverless
- Docker

## Test locally

```sh
docker run --rm -v "$PWD":/var/task -e AWS_ACCESS_KEY_ID="YOUR_KEY" -e AWS_SECRET_ACCESS_KEY="YOU_SECRET" lambci/lambda:nodejs8.10 handler.check '{"postcode":"M1 2WA","fullAddress":"49 Store Street, Manchester, M1 2WA"},"email":"me@example.com"'
```

## Deploy

```sh
serverless deploy -v
```