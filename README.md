# lq.ai
Lead Scoring AI Agent using express.js

Pre-requisite: Node.js must be installed in your system

Step 1: Create a `.env` file to the project root

Step 2: Add
```
OPENAI_API_KEY=<your-open-ai-api-key>      
PORT=8001
<add langsmith if you wish to>
```

Step 3: Open `terminal` and run `npm install`

Step 4: Now run `npm start`

Step 5: That's it! Try scoring your leads by sending a `POST` request using `postman` at: "`localhost:8001/score`" 

Example Body:
```
{
  "name": "Jane Doe",
  "email": "jane@saas.com",
  "company": "SaaS Inc.",
  "role": "CMO",
  "budget": "$5,000",
  "painPoints": "Struggles with attribution and reporting"
}
```
