The assistant sends its conversation to OpenAI from the server. The API key must stay in a server environment variable; never add it to browser JavaScript or commit it to the repository.

1. Install Node.js 18 or newer.
2. Set the API key in the same terminal used to start the site:

   ```powershell
   $env:OPENAI_API_KEY = "your OpenAI API key"
   npm start
   ```

3. Open `http://localhost:3000` (not the HTML file using a `file://` URL and not the static preview on port 8787).

The server uses the OpenAI `gpt-4o-mini` model by default. To select a different model available to your account, set `OPENAI_MODEL` in the server environment. Never expose either environment variable in client-side code.

Deploy the project to a Node.js host that supports Node 18 or newer, set `OPENAI_API_KEY` as a private environment variable in the host's settings, and use `npm start` as the start command. A static-only host cannot run this protected API endpoint; it needs a server or serverless function.

The assistant is designed for shopping guidance. It should not be used to collect payment information or sensitive personal details. Conversation history is held in the visitor's browser memory for the open page and is sent to OpenAI when a message is submitted; this project does not store chat transcripts on its server.
