(() => {
  const trigger = document.querySelector("[data-store-search]");
  if (!trigger || typeof products === "undefined" || !Array.isArray(products)) return;

  const searchMarkup = `
    <div class="store-dialog-backdrop" data-search-backdrop hidden>
      <section class="store-search-dialog" role="dialog" aria-modal="true" aria-labelledby="store-search-title">
        <header class="store-dialog-header">
          <h2 id="store-search-title">SEARCH THE COLLECTION</h2>
          <button class="store-dialog-close" type="button" data-search-close aria-label="Close search">×</button>
        </header>
        <form class="store-search-form" data-search-form role="search">
          <input class="store-search-input" data-search-input type="search" placeholder="Try orange tee or green hoodie" aria-label="Search clothing" autocomplete="off" />
          <button class="store-search-submit" type="submit">SEARCH</button>
        </form>
        <div class="store-search-results" data-search-results aria-live="polite">
          <p class="store-search-message">Search hoodies and T-shirts by name, design, or color.</p>
        </div>
      </section>
    </div>
    <aside class="store-assistant">
      <section class="store-chat-panel" data-chat-panel role="dialog" aria-label="FLYEST style assistant" hidden>
        <header class="store-chat-heading">
          <div><span class="store-chat-brand">FLYEST STYLE ASSISTANT</span><span class="store-chat-status" data-chat-status>Checking AI connection…</span></div>
          <button class="store-dialog-close" type="button" data-chat-close aria-label="Close assistant">×</button>
        </header>
        <div class="store-chat-messages" data-chat-messages aria-live="polite" aria-relevant="additions text">
          <div class="store-chat-message"><p>Hello. I’m the FLYEST shopping assistant. I can help you compare pieces, find a style within your budget, and answer questions about fit, shipping, and exchanges. How may I help?</p></div>
        </div>
        <div class="store-chat-chips">
          <button class="store-chat-chip" type="button">Show me hoodies</button>
          <button class="store-chat-chip" type="button">Find a tee</button>
          <button class="store-chat-chip" type="button">Shipping info</button>
        </div>
        <form class="store-chat-form" data-chat-form>
          <input class="store-chat-input" data-chat-input type="text" maxlength="1200" placeholder="Ask about FLYEST..." aria-label="Message the style assistant" autocomplete="off" />
          <button class="store-chat-send" type="submit" aria-label="Send message">➤</button>
        </form>
        <p class="store-chat-disclosure">AI responses may be imperfect. Please don’t share payment or personal information.</p>
      </section>
      <button class="store-chat-toggle" type="button" data-chat-toggle aria-expanded="false" aria-label="Open FLYEST style assistant">
        <span aria-hidden="true">✦</span><span>STYLE ASSISTANT</span>
      </button>
    </aside>`;
  document.body.insertAdjacentHTML("beforeend", searchMarkup);

  const backdrop = document.querySelector("[data-search-backdrop]");
  const searchInput = document.querySelector("[data-search-input]");
  const searchResults = document.querySelector("[data-search-results]");
  const chatPanel = document.querySelector("[data-chat-panel]");
  const chatToggle = document.querySelector("[data-chat-toggle]");
  const chatMessages = document.querySelector("[data-chat-messages]");
  const chatInput = document.querySelector("[data-chat-input]");
  const chatForm = chatPanel.querySelector("[data-chat-form]");
  const chatSend = chatForm.querySelector(".store-chat-send");
  const chatStatus = chatPanel.querySelector("[data-chat-status]");
  const conversation = [];
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const productUrl = (product) => `${product.category === "hoodies" ? "hoodie" : "shirt"}.html?id=${encodeURIComponent(product.id)}`;
  const priceFor = (product) => product.salePrice ?? product.price;

  if (window.location.protocol === "file:") {
    chatStatus.textContent = "Open through the FLYEST server to use AI";
  } else {
    fetch("/api/status")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Assistant server is unavailable.")))
      .then((status) => {
        chatStatus.textContent = status.configured
          ? "AI shopping assistant · Powered by Gemini"
          : "AI setup required · See assistant setup guide";
      })
      .catch(() => {
        chatStatus.textContent = "AI server offline · run npm start";
      });
  }

  const closeSearch = () => {
    backdrop.hidden = true;
    trigger.focus();
  };
  const closeChat = () => {
    chatPanel.hidden = true;
    chatToggle.setAttribute("aria-expanded", "false");
    chatToggle.focus();
  };

  const renderSearch = (query) => {
    const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
    const matches = products.filter((product) => {
      const aliases = product.category === "hoodies" ? "hoodie hoodies sweatshirt sweatshirts" : "tee tees tshirt tshirts shirt shirts";
      const searchable = normalize(`${product.name} ${product.category} ${product.id} ${aliases}`);
      return terms.every((term) => searchable.includes(term));
    });
    searchResults.replaceChildren();
    if (!matches.length) {
      const message = document.createElement("p");
      message.className = "store-search-message";
      message.textContent = "No matching pieces yet. Try a color like green, orange, or black.";
      searchResults.appendChild(message);
      return;
    }

    matches.slice(0, 12).forEach((product) => {
      const link = document.createElement("a");
      link.className = "store-search-result";
      link.href = productUrl(product);
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = "";
      image.loading = "lazy";
      const details = document.createElement("span");
      const name = document.createElement("span");
      name.className = "store-search-result-name";
      name.textContent = product.name;
      const category = document.createElement("span");
      category.className = "store-search-result-category";
      category.textContent = product.category === "hoodies" ? "HOODIE" : "T-SHIRT";
      details.append(name, category);
      if (product.isSoldOut) {
        const soldOut = document.createElement("span");
        soldOut.className = "store-search-soldout";
        soldOut.textContent = "SOLD OUT";
        details.appendChild(soldOut);
      }
      const price = document.createElement("span");
      price.className = "store-search-result-price";
      price.textContent = `₱${priceFor(product).toLocaleString("en-PH")}`;
      link.append(image, details, price);
      searchResults.appendChild(link);
    });
  };

  const addChatMessage = (text, className = "") => {
    const message = document.createElement("div");
    message.className = `store-chat-message ${className}`.trim();
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    message.appendChild(paragraph);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
  };

  const appendProductLinks = (message, matches) => {
    if (!matches.length) return;
    const list = document.createElement("div");
    list.className = "store-chat-products";
    matches.slice(0, 3).forEach((product) => {
      const link = document.createElement("a");
      link.className = "store-chat-product";
      link.href = productUrl(product);
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = "";
      const info = document.createElement("span");
      info.append(document.createTextNode(product.name));
      const price = document.createElement("small");
      price.textContent = product.isSoldOut
        ? "SOLD OUT"
        : `₱${priceFor(product).toLocaleString("en-PH")}`;
      info.appendChild(price);
      link.append(image, info);
      list.appendChild(link);
    });
    message.appendChild(list);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const sendChat = async (rawText) => {
    const query = rawText.trim();
    if (!query || chatSend.disabled) return;
    addChatMessage(query, "store-chat-message-user");
    chatInput.value = "";
    chatSend.disabled = true;
    chatInput.disabled = true;
    const waiting = addChatMessage("Thinking through that for you…");
    try {
      if (window.location.protocol === "file:") {
        throw new Error("The AI needs the FLYEST server. Don’t open the HTML file directly: install Node.js 18+, set GEMINI_API_KEY privately, run `npm start` in the project folder, then visit http://localhost:3000.");
      }
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...conversation, { role: "user", content: query }] }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The AI assistant service is unavailable. Please start the FLYEST server and try again.");
      }
      if (!response.ok) throw new Error(result.error || `Assistant request failed (${response.status}).`);
      if (typeof result.message !== "string" || !Array.isArray(result.productIds)) {
        throw new Error("The assistant returned an invalid response.");
      }
      waiting.remove();
      const answer = addChatMessage(result.message);
      const recommended = result.productIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product) => product && !product.isSoldOut);
      appendProductLinks(answer, recommended);
      conversation.push({ role: "user", content: query }, { role: "assistant", content: result.message });
      if (conversation.length > 10) conversation.splice(0, conversation.length - 10);
    } catch (error) {
      waiting.remove();
      const message = error instanceof TypeError
        ? "I can’t reach the AI server. Start the FLYEST site with `npm start`, then open http://localhost:3000. The server also needs a private GEMINI_API_KEY."
        : error.message || "I couldn’t connect just now. Please try again shortly.";
      addChatMessage(message);
    } finally {
      chatSend.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  trigger.addEventListener("click", () => {
    chatPanel.hidden = true;
    chatToggle.setAttribute("aria-expanded", "false");
    backdrop.hidden = false;
    searchInput.focus();
  });
  backdrop.querySelector("[data-search-close]").addEventListener("click", closeSearch);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeSearch();
  });
  backdrop.querySelector("[data-search-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    renderSearch(searchInput.value.trim());
  });
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim()) renderSearch(searchInput.value.trim());
    else searchResults.innerHTML = '<p class="store-search-message">Search hoodies and T-shirts by name, design, or color.</p>';
  });

  chatToggle.addEventListener("click", () => {
    const open = chatPanel.hidden;
    backdrop.hidden = true;
    chatPanel.hidden = !open;
    chatToggle.setAttribute("aria-expanded", String(open));
    if (open) chatInput.focus();
  });
  chatPanel.querySelector("[data-chat-close]").addEventListener("click", closeChat);
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendChat(chatInput.value);
  });
  chatPanel.querySelectorAll(".store-chat-chip").forEach((chip) => {
    chip.addEventListener("click", () => void sendChat(chip.textContent));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!backdrop.hidden) closeSearch();
      if (!chatPanel.hidden) closeChat();
    }
  });
})();
