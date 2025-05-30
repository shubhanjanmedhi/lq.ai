require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatOpenAI } = require("@langchain/openai");
const { MessagesAnnotation, StateGraph } = require("@langchain/langgraph");
const { ToolNode } = require("@langchain/langgraph/prebuilt");
const { AIMessage } = require("@langchain/core/messages");

const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "o4-mini-2025-04-16"
});

const leadScoringPrompt = tool(
    async({ name, email, company, role, budget, painPoints }) => {
        return `
            Lead Info:
            - Name: ${name}
            - Email: ${email}
            - Company: ${company}
            - Role: ${role}
            - Budget: ${budget}
            - Pain Points: ${painPoints}
        `;
    },
    {
        name: "Lead_Scoring",
        description: "Scores lead based on given data",
        schema: z.object({
        name: z.string().describe("name of the lead"),
        email: z.string().describe("email of the lead"),
        company: z.string().describe("company where the lead works"),
        role: z.string().describe("role of the lead in the company"),
        budget: z.string().describe("budget of the company"),
        painPoints: z.string().describe("pain points of the company")
        }),
    }
);

const tools = [leadScoringPrompt];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);

async function llmCall(state) {
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `You are a B2B marketing analyst. Evaluate the following lead and classify it as 'Hot', 'Warm', or 'Cold'.
                Rules:
                - "Hot" = Decision-maker + Clear pain + Budget present
                - "Warm" = Relevant role but missing info
                - "Cold" = Generic role or no urgency
                Return only one word: Hot, Warm, or Cold.
                `
    },
    ...state.messages
  ]);

  return {
    messages: [result]
  };
}

const toolNode = new ToolNode(tools);

function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  return "__end__";
}

const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges(
    "llmCall",
    shouldContinue,
    {
      "Action": "tools",
      "__end__": "__end__",
    }
  )
  .addEdge("tools", "llmCall")
  .compile();

const app = express();
app.use(bodyParser.json());

app.post("/score", async (req, res) => {
  try {
    const messages = [{
    role: "user",
    content: "Score this lead based on the following data: "+JSON.stringify(req.body).replace(/[{}]/g, '')
    }];

    const result = await agentBuilder.invoke({ messages });
    const msg = result.messages;

    console.log("✅ Lead Score:", msg[1].content);
    res.json({ classification: msg[1].content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));