The assistant sends its conversation to OpenAI from the server. The API key must stay in a server environment variable; never add it to browser JavaScript, commit it to the repository, or share it in chat.

1. Install Node.js 18 or newer.
2. Set the API key in the same terminal used to start the site:

   ```powershell
   $env:OPENAI_API_KEY = "your OpenAI API key"
   npm start
   ```

3. Open `http://localhost:3000` (not the HTML file using a `file://` URL and not the static preview on port 8787).

The server uses the OpenAI `gpt-4o-mini` model by default. To select a different model available to your account, set `OPENAI_MODEL` in the server environment. Never expose either environment variable in client-side code.

## Deploy the site and assistant to Render

This project includes a Render Blueprint in `render.yaml`. It deploys the storefront and its Node.js assistant API together, so the browser can call the API on the same origin.

1. Sign in to [Render](https://dashboard.render.com/) using the GitHub account that owns this repository.
2. In Render, create a new **Blueprint** and select the `sample-2-flyest` GitHub repository.
3. Review the `flyest-store` web service from `render.yaml` and deploy it. When Render asks for `OPENAI_API_KEY`, leave it for the next step if you do not have the key ready.
4. In the Render dashboard, open the `flyest-store` service, then **Environment**. Add `OPENAI_API_KEY` with an API key from your OpenAI account, save it, and redeploy the service. Do not share or commit the key.
5. Open the service's `onrender.com` URL. The assistant status should say it is ready when the key is configured.

The Render Free service may spin down when idle, so the first request after inactivity can take longer. OpenAI API usage is billed separately by OpenAI; set an API usage budget in your OpenAI account. The Render URL serves the storefront and the assistant together. GitHub Pages remains a separate static copy and does not run the assistant.

The assistant is designed for shopping guidance. It should not be used to collect payment information or sensitive personal details. Conversation history is held in the visitor's browser memory for the open page and is sent to OpenAI when a message is submitted; this project does not store chat transcripts on its server.
