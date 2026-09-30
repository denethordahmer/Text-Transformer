/* =========================================================================
   TEXT TRANSFORMER — transformer.js
   Two modes: Rewrite Text (19 styles) and Optimise as Prompt.
   Rewrite mode has an Intensity toggle. Prompt mode has Target and Depth.
   Uses OpenRouter. API key stored in localStorage on this device only.

   No images. No vision. Text in, text out.
   ========================================================================= */

(function () {
  "use strict";

  /* =======================================================================
     DOM
     ======================================================================= */
  const btnClearTop        = document.getElementById("btnClearTop");

  const modeSelect         = document.getElementById("modeSelect");

  const rewriteStyleRow    = document.getElementById("rewriteStyleRow");
  const rewriteStyle       = document.getElementById("rewriteStyle");
  const intensityRow       = document.getElementById("intensityRow");
  const intensity          = document.getElementById("intensity");

  const promptTargetRow    = document.getElementById("promptTargetRow");
  const promptTarget       = document.getElementById("promptTarget");
  const promptDepthRow     = document.getElementById("promptDepthRow");
  const promptDepth        = document.getElementById("promptDepth");

  const inputText          = document.getElementById("inputText");
  const btnTransform       = document.getElementById("btnTransform");

  const statusLine         = document.getElementById("statusLine");

  const outputGroup        = document.getElementById("outputGroup");
  const outputMeta         = document.getElementById("outputMeta");
  const outputText         = document.getElementById("outputText");
  const btnCopyOutput      = document.getElementById("btnCopyOutput");
  const btnSaveOutput      = document.getElementById("btnSaveOutput");

  const openrouterKey      = document.getElementById("openrouterKey");
  const btnSaveKey         = document.getElementById("btnSaveKey");
  const btnClearKey        = document.getElementById("btnClearKey");
  const btnRefreshModels   = document.getElementById("btnRefreshModels");
  const pricingFilter      = document.getElementById("pricingFilter");
  const providerFilter     = document.getElementById("providerFilter");
  const modelList          = document.getElementById("modelList");
  const modelCount         = document.getElementById("modelCount");

  /* =======================================================================
     GENERATION SETTINGS
     Temperature is derived from the intensity setting in Rewrite mode.
     Higher intensity → higher temperature → more committed stylistic output.
     Prompt mode uses a lower temperature for precision and structure.
     ======================================================================= */
  const TEMPERATURE_BY_INTENSITY = {
    subtle:   0.6,
    moderate: 0.8,
    strong:   1.0,
    extreme:  1.15
  };

  const PROMPT_MODE_TEMPERATURE = 0.6;

  function getTemperature() {
    if (modeSelect.value === "rewrite") {
      return TEMPERATURE_BY_INTENSITY[intensity.value] || 0.8;
    }
    return PROMPT_MODE_TEMPERATURE;
  }

  /* =======================================================================
     STYLE DEFINITIONS — 19 total
     Each description is what actually goes into the AI prompt.
     ======================================================================= */
  const STYLES = {

    /* --- Common / Everyday --- */
    casual: {
      name: "Casual",
      description:
        "Relaxed conversational tone. Contractions welcome and encouraged. Everyday vocabulary. Mix short punchy sentences with longer relaxed ones. Write as if speaking to a friend over coffee. No stuffiness, no bureaucratic phrasing. The occasional aside or side comment is fine. Sound human, not polished."
    },

    concise: {
      name: "Concise",
      description:
        "Compress the text without losing meaning. Cut every non-essential word, phrase, or sentence. No padding, no restating, no hedging, no filler transitions like 'in order to' or 'as a matter of fact'. Every sentence must earn its place. Merge overlapping sentences. Prefer plain common words over jargon and complex vocabulary where doing so does not lose precision. Short sentences over long. Aim for roughly 40–60% of the original length. If the source is already tight, do not force further cutting — instead sharpen what remains. Never sacrifice meaning for brevity. If removing a word changes the meaning, keep it. The result should feel crisp, clear, and effortless to read."
    },

    expand: {
      name: "Expand",
      description:
        "Preserve the meaning but elaborate. Add context, examples, explanation of why things matter. Break single statements into explanatory sentences. Aim for roughly 150–200% of the original length. Every added sentence must add real content — do not pad with empty phrases like 'it is important to note that'. Explain, illustrate, connect ideas. Where a claim is made, briefly note the reasoning behind it. Where an abstract idea appears, give a concrete example. Where two ideas connect, state the connection explicitly."
    },

    persuasive: {
      name: "Persuasive",
      description:
        "Steer the reader toward agreement or action. Use rhetorical structure, evidence-forward phrasing, and confident claims. Anticipate objections and address them before they arise. Strong verbs and clear stakes. Frame conclusions as natural outcomes of the reasoning. Do not become dishonest — persuasion is legitimate, deception is not. Every claim should be defensible from the source content. Use rhythm and cadence to build momentum toward the point. Address the reader directly where it strengthens the case."
    },

    /* --- Professional Registers --- */
    academic: {
      name: "Academic",
      description:
        "Formal scholarly register. Measured claims, hedged where appropriate — 'suggests', 'appears', 'may indicate', 'it is reasonable to conclude'. Reference reasoning, not just conclusions. Avoid first-person where possible. No contractions. Precise terminology used consistently. Longer, well-structured sentences. Avoid sweeping claims. Acknowledge uncertainty where it exists. Where concepts are complex, define them before using them. Where claims are strong, cite the reasoning. Where the source contains lists or enumerations, present them with clear structure — subheadings, numbered points, or comparable formatting where it aids clarity. Neutral, third-person voice. No editorialising, no rhetorical questions, no direct address to the reader. Think of the register of a well-edited encyclopedia entry or a peer-reviewed article, not a blog post."
    },

    journalistic: {
      name: "Journalistic",
      description:
        "News-report style. Lead with the most important fact first — inverted pyramid structure. Short paragraphs, often one or two sentences each. Attribute claims to sources where relevant. Neutral tone, no editorialising. Short declarative sentences. Facts before interpretation. Quote directly if the source contains quotable material. Where the source contains a timeline or sequence, preserve chronological order. Where a specific figure, date, or name appears, keep it exact. Avoid adjectives that carry opinion. Every paragraph should contain at least one hard fact or clear statement."
    },

    technical_manual: {
      name: "Technical Manual",
      description:
        "Dry instructional register. Step-by-step where appropriate. Numbered or sequenced where order matters. No personality, no fluff, no rhetorical flourishes. Every sentence is either instruction, prerequisite, or necessary context. Imperative mood for steps ('Press the button', not 'You should press the button'). Warning or note blocks where warranted. Where multiple steps exist, separate them onto their own lines. Where a step depends on a condition, state the condition before the step. Where a step has a common failure mode, note the failure mode. No metaphors. No storytelling. The reader is here to do a task."
    },

    corporate: {
      name: "Corporate",
      description:
        "Business-professional register with commercial energy. Lead with the value proposition or core outcome, then support it. Use action-oriented language. Strategic framing — emphasise outcomes, stakeholders, deliverables, timelines. Standard business vocabulary, no casual phrasing. Confident, forward-looking tone. Where the source contains features, translate them into benefits. Where the source contains benefits, translate them into concrete outcomes for the reader or their organisation. Where the source lists multiple points, structure them as clear, scannable items. Second person where it strengthens the pitch — 'you', 'your team', 'your organisation'. Avoid overpromising. Do not fabricate specifics — no invented metrics, dates, or named initiatives. The voice should feel like a well-briefed executive pitching with conviction, not a marketing department shouting slogans."
    },

    /* --- Creative / Story --- */
    poetic: {
      name: "Poetic",
      description:
        "Lyrical register. Rhythm and cadence matter as much as meaning. Imagery over plain statement. Compress meaning into evocative phrasing. Line breaks or stanza structure if the content supports it. Restraint is part of poetry — do not overdo imagery. Choose one strong image over three weak ones. Sound matters — read the result aloud in your head and adjust the rhythm. Where a metaphor appears, commit to it fully rather than mixing images. Where a fact appears, let it arrive through image rather than statement. The result should feel shaped, not just decorated."
    },

    storytelling: {
      name: "Storytelling",
      description:
        "Narrative prose. Show, do not tell. Scene-setting with sensory details. Pace matters — build, release, build. Characters or subjects have voice and texture. Specific concrete details over abstractions. This is not a summary — it is a scene. Even non-fiction material can be told this way. Present tense where it fits the mood. Where the source contains facts, they arrive through action or observation, not exposition. Where the source contains a timeline, unfold it as events rather than stating it as chronology. Where the source contains a person or thing, give it texture — how it looks, sounds, moves. The reader should feel they are watching, not being told."
    },

    documentary: {
      name: "Documentary",
      description:
        "Documentary narration voice. Measured, calm, factual. Cinematic in pacing but never dramatised. Present tense where it fits. Specific concrete details carry the weight. Let facts speak for themselves. No opinion inserted. Short sentences where impact matters, longer ones where context matters. Think nature documentary — unhurried and precise. Every sentence should advance understanding. No filler adjectives. Where a number appears, use it exactly. Where a place is mentioned, name it. Where the source contains a process, unfold it as sequence. The voice trusts the material to hold the reader's attention without embellishment."
    },

    medieval_fantasy: {
      name: "Medieval Fantasy",
      description:
        "Archaic high-fantasy register. Older diction used sparingly and with purpose — 'thee', 'thou', 'forsooth' only where they genuinely fit, never as parody. Epic in tone. Formal grammatical structure. References to old ways, traditions, oaths, and ancestral matters. Grandeur without purple prose. The voice of a chronicle written by a scholar of an old kingdom. Invert word order where it strengthens the cadence. Prefer older verb forms where natural — 'hath', 'doth', 'shall' — but never as a gimmick. Where the source contains a modern term, find its older equivalent or describe it in period-appropriate language. The result should feel as if it could be carved into stone or recited at a court."
    },

    scifi_log: {
      name: "Sci-Fi Log",
      description:
        "Futuristic log-style entries. Timestamped or sequential feel. Technical-sounding but not burdened with jargon. Cold, precise observations. Occasional entries of discovery, alarm, or routine. Suggests a larger world without explaining it. Short declarative sentences mixed with occasional longer technical passages. The voice of a recording, not a story. Where the source contains emotional content, translate it into the flat, professional tone of someone recording data. Where the source contains explanation, allow it to be delivered as observation, measurement, or speculation. Leave the occasional unexplained reference that suggests the larger world — a system name, a protocol code, a crew designation."
    },

    /* --- Format / Structure --- */
    markdown_brief: {
      name: "Markdown Brief",
      description:
        "Reformat as a clean markdown document. Use headings (##) for major sections. Use bullet points for parallel items. Use bold for key terms. Keep it scannable — aim for one to three sentences or short bullets per idea. Do not add content that was not in the source — reorganise, do not expand. If the source is naturally one paragraph, break it into sections that make sense. Where the source contains multiple parallel ideas, present them as parallel bullets. Where the source contains a sequence, present it as a numbered list. Where the source contains hierarchy, present it as nested bullets. The reader should be able to skim and understand the shape of the document before reading any single line."
    },

    /* --- Unusual / Specialty --- */
    eli5: {
      name: "ELI5",
      description:
        "Explain as if to a curious five-year-old. Very short sentences. Common words only. Concrete comparisons and familiar examples — animals, toys, food, everyday things. No jargon at all. If a technical term must appear, define it immediately in plain words. Patient and warm tone. Never condescending — the reader is curious, not stupid. Where an abstract concept appears, anchor it to something physical or familiar. Where a process is described, walk through it step by step as if showing someone how something works. Where a number appears, express it in terms of something the reader can picture — 'about as many as fingers on both hands' rather than 'ten'."
    },

    interview_transcript: {
      name: "Interview Transcript",
      description:
        "Reformat as a Q&A interview transcript. Questions from an unnamed interviewer, answers from the source material's voice. Natural speech patterns — occasional filler like 'well', 'I mean', 'you know' where realistic. Answer questions directly, then elaborate naturally. Do not invent facts not present in the source. Each Q&A pair should stand on its own. Questions should sound like a real interviewer — curious, probing, follow-up-oriented. Answers should have the texture of spoken language: self-interruptions, half-finished thoughts completed on the second try, occasional digressions. Where the source contains specific facts, deliver them inside an answer as if recalled in the moment."
    },

    faq: {
      name: "FAQ",
      description:
        "Reformat as a Frequently Asked Questions document. Group questions logically. Answer each directly and concisely. Each answer should be self-contained — the reader should not need to have read previous answers. Question phrasing should match how a real user would ask, not how a marketer would write. Friendly, helpful, plain-speaking tone. Where the source contains a common misconception, present it as a question and correct it in the answer. Where the source contains a process, present each major step as its own question. Where the source contains a decision, present it as 'What should I do if…?' with the answer covering both paths."
    },

    peer_review: {
      name: "Peer Review",
      description:
        "Scholarly critique format. State strengths first, then weaknesses. Be specific — vague critique is worthless. Point to what could be improved and why. Treat the source as a submission under review. Firm but professional tone. No personal attacks, no sarcasm. Recommend concrete revisions where possible. Where a claim is weak, note why. Where structure is unclear, propose a specific reorganisation. Where terminology is inconsistent, point to the inconsistency. Where a section could be strengthened by addition, suggest what to add. Where a section could be strengthened by removal, suggest what to cut. The critique should read as constructive, not dismissive — the goal is to help the author improve the work."
    },

    parody: {
      name: "Parody",
      description:
        "Exaggerate the source's own stylistic tics for comic effect. Identify what makes the source recognisable — its pet phrases, its rhythm, its assumptions, its verbal habits — and turn the volume up. The reader should recognise the original while also recognising it as a joke. Stay affectionate unless the source itself is being mocked. Do not invent new facts — bend the style, not the content. Where the source uses a particular cliché, repeat it more often. Where the source over-explains, explain even more. Where the source hedges, hedge more elaborately. The joke should land through committed exaggeration of what was already there, not through adding new absurdity."
    }
  };

  /* =======================================================================
     INTENSITY DEFINITIONS
     ======================================================================= */
  const INTENSITY = {
    subtle:
      "Apply the style with a light touch. Preserve the source's voice and structure as much as possible. The target style should be noticeable but the reader can still feel the original behind it. When in doubt, hold back rather than push.",
    moderate:
      "Apply the style clearly. The source's voice is still audible underneath, but the target style is the dominant one. This is the default — commit to the style without going overboard.",
    strong:
      "Commit fully to the style. The source should be recognisable in content, not in voice. Do not hold back on stylistic features. If a choice feels too aggressive, it is probably the right one at this intensity.",
    extreme:
      "Maximum commitment. Push every stylistic feature to its limit. Sacrifice clarity or smoothness if the style demands it. The result should read as a pure, undiluted example of the style. If it feels excessive, push further."
  };

  /* =======================================================================
     PROMPT MODE — TARGETS
     ======================================================================= */
  const PROMPT_TARGETS = {
    image: {
      name: "Image Generation",
      description:
        "Produce a prompt for an image-generation AI model. Cover: the subject and what it is doing; the setting or environment; composition (camera angle, framing, distance, focal length); lighting (direction, quality, time of day, colour temperature); colour palette; mood or atmosphere; art style, medium, or artist reference if implied; and any technical details that improve output quality (renderer, resolution hints, film stock, lens). Do not include instructions to the model like 'create an image' — just the prompt content."
    },
    video: {
      name: "Video Generation",
      description:
        "Produce a prompt for a video-generation AI model. Cover: the subject and how it moves or changes across time; camera movement (static, pan, tilt, dolly, crane, handheld); shot type and framing; pacing and duration feel; lighting and how it may shift during the clip; mood; art style or medium. Emphasise what happens over the clip's duration, not just the opening frame. Do not include meta-instructions — just the prompt content."
    },
    text: {
      name: "Text Model",
      description:
        "Produce a prompt for a text-only AI model (an LLM). Clarify the goal, any constraints, the desired format of the output, and any context the model needs to know. Structure it so the model understands exactly what is being asked and how to deliver it. Include any role, tone, or audience guidance that would improve the result. Do not include meta-commentary about the prompt itself."
    },
    code: {
      name: "Code Model",
      description:
        "Produce a prompt for a code-generation AI model. Clarify: the programming language or framework; the exact behaviour expected; input and output types where relevant; edge cases that must be handled; style conventions or constraints; and any dependencies allowed or forbidden. Include example input and expected output where helpful. Do not include meta-commentary about the prompt itself."
    }
  };

  /* =======================================================================
     PROMPT MODE — DEPTH
     ======================================================================= */
  const PROMPT_DEPTHS = {
    tight:
      "Preserve the user's intent narrowly. Do not add content the user did not ask for. Do not expand the scope. Re-engineer the wording and structure only — clarify what is there without inventing new details or widening the subject.",
    enriched:
      "Enrich the prompt with details the user implied or would obviously want for this kind of task. Add specificity, concrete choices, and additional descriptors where they improve the result. Do not change the core subject. Do not add unrelated elements. Every added detail must serve the original intent."
  };

  /* =======================================================================
     STATE
     ======================================================================= */
  let allModels = [];
  let currentModel = "";
  let savedModelId = "";
  let lastOutput = "";
  let fallbackCounter = 0;

  const KEY_STORAGE = "transformer_openrouter_key";
  const MODEL_STORAGE = "transformer_openrouter_model";

  /* =======================================================================
     STATUS LINE
     ======================================================================= */
  function showStatus(msg, kind) {
    statusLine.classList.remove("hidden", "error", "success");
    if (kind === "error") statusLine.classList.add("error");
    if (kind === "success") statusLine.classList.add("success");
    statusLine.textContent = msg;
  }

  function hideStatus() {
    statusLine.classList.add("hidden");
    statusLine.textContent = "";
  }

  /* =======================================================================
     MODE SWITCHING
     ======================================================================= */
  function updateModeVisibility() {
    const mode = modeSelect.value;
    if (mode === "rewrite") {
      rewriteStyleRow.classList.remove("hidden");
      intensityRow.classList.remove("hidden");
      promptTargetRow.classList.add("hidden");
      promptDepthRow.classList.add("hidden");
    } else {
      rewriteStyleRow.classList.add("hidden");
      intensityRow.classList.add("hidden");
      promptTargetRow.classList.remove("hidden");
      promptDepthRow.classList.remove("hidden");
    }
  }

  modeSelect.addEventListener("change", updateModeVisibility);

  /* =======================================================================
     CLEAR
     ======================================================================= */
  btnClearTop.addEventListener("click", () => {
    inputText.value = "";
    lastOutput = "";
    outputText.textContent = "Output will appear here after you tap Transform.";
    outputMeta.textContent = "";
    btnCopyOutput.disabled = true;
    btnSaveOutput.disabled = true;
    hideStatus();
  });

  /* =======================================================================
     KEY STORAGE
     ======================================================================= */
  function loadKey() {
    try {
      const k = localStorage.getItem(KEY_STORAGE);
      if (k) openrouterKey.value = k;
    } catch (e) {}
  }

  btnSaveKey.addEventListener("click", () => {
    const k = openrouterKey.value.trim();
    if (!k) {
      showStatus("Paste your OpenRouter API key first.", "error");
      return;
    }
    if (!k.startsWith("sk-or-")) {
      showStatus("That doesn't look like an OpenRouter key (should start with sk-or-).", "error");
      return;
    }
    try {
      localStorage.setItem(KEY_STORAGE, k);
      showStatus("API key saved to this device.", "success");
      setTimeout(hideStatus, 2000);
    } catch (e) {
      showStatus("Could not save key.", "error");
    }
  });

  btnClearKey.addEventListener("click", () => {
    if (!confirm("Remove saved API key from this device?")) return;
    try { localStorage.removeItem(KEY_STORAGE); } catch (e) {}
    openrouterKey.value = "";
    allModels = [];
    modelList.innerHTML = '<option value="">Tap Refresh Models</option>';
    providerFilter.innerHTML = '<option value="all" selected>All providers</option>';
    currentModel = "";
    updateModelCount(0);
    showStatus("Key cleared.", "success");
    setTimeout(hideStatus, 1500);
  });

  /* =======================================================================
     MODEL LIST — text-in, text-out only
     ======================================================================= */
  function isFreeModel(m) {
    const p = m.pricing || {};
    const promptPrice = parseFloat(p.prompt || 0);
    const completionPrice = parseFloat(p.completion || 0);
    return promptPrice === 0 && completionPrice === 0;
  }

  function getProviderName(m) {
    if (m.id && m.id.includes("/")) {
      const prefix = m.id.split("/")[0];
      return prefix
        .replace(/[-_]/g, " ")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Other";
  }

  function isTextToTextModel(m) {
    const arch = m.architecture || {};
    const out = arch.output_modalities || ["text"];
    if (!out.includes("text")) return false;
    if (out.includes("image") || out.includes("video") || out.includes("audio")) return false;
    return true;
  }

  function updateModelCount(n) {
    modelCount.textContent = String(n);
  }

  function rebuildModelDropdown() {
    const pricingMode = pricingFilter.value;
    const providerMode = providerFilter.value;

    let filtered = allModels.slice();

    if (pricingMode === "free") {
      filtered = filtered.filter(m => isFreeModel(m));
    } else if (pricingMode === "paid") {
      filtered = filtered.filter(m => !isFreeModel(m));
    }

    if (providerMode !== "all") {
      filtered = filtered.filter(m => getProviderName(m) === providerMode);
    }

    filtered.sort((a, b) => {
      const fa = isFreeModel(a) ? 0 : 1;
      const fb = isFreeModel(b) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (a.name || "").localeCompare(b.name || "");
    });

    updateModelCount(filtered.length);

    const frag = document.createDocumentFragment();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = filtered.length
      ? `Select a model (${filtered.length} shown)`
      : "No models match filters";
    frag.appendChild(placeholder);

    let restoreId = null;

    for (const m of filtered) {
      const opt = document.createElement("option");
      opt.value = m.id;

      let priceHint = "";
      const p = m.pricing || {};
      const promptPrice = parseFloat(p.prompt || 0);
      if (isFreeModel(m)) {
        priceHint = " — free";
      } else if (promptPrice > 0) {
        const perM = (promptPrice * 1000000).toFixed(2);
        priceHint = ` — $${perM}/M in`;
      }

      opt.textContent = (m.name || m.id) + priceHint;
      frag.appendChild(opt);

      if (m.id === savedModelId || m.id === currentModel) {
        restoreId = m.id;
      }
    }

    modelList.innerHTML = "";
    modelList.appendChild(frag);

    if (restoreId) {
      modelList.value = restoreId;
      currentModel = restoreId;
    } else {
      currentModel = "";
    }
  }

  function populateProviderFilter() {
    const set = new Set();
    for (const m of allModels) {
      set.add(getProviderName(m));
    }

    const providers = Array.from(set).sort((a, b) => a.localeCompare(b));
    const current = providerFilter.value || "all";

    providerFilter.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All providers";
    providerFilter.appendChild(allOpt);

    for (const prov of providers) {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      providerFilter.appendChild(opt);
    }

    if (current && providers.includes(current)) {
      providerFilter.value = current;
    } else {
      providerFilter.value = "all";
    }
  }

  btnRefreshModels.addEventListener("click", async () => {
    const btnLabel = btnRefreshModels.textContent;
    btnRefreshModels.textContent = "Loading…";
    btnRefreshModels.disabled = true;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const models = json.data || [];

      const textModels = models.filter(m => isTextToTextModel(m));

      if (textModels.length === 0) {
        allModels = [];
        modelList.innerHTML = '<option value="">No text models found</option>';
        updateModelCount(0);
        showStatus("No text-to-text models returned.", "error");
        return;
      }

      allModels = textModels;

      populateProviderFilter();
      rebuildModelDropdown();

      showStatus(`${textModels.length} text models loaded.`, "success");
      setTimeout(hideStatus, 2200);
    } catch (e) {
      console.warn("Model fetch failed:", e);
      allModels = [];
      modelList.innerHTML = '<option value="">Failed to load — check connection</option>';
      updateModelCount(0);
      showStatus("Could not load model list. " + (e.message || "Check your connection."), "error");
    } finally {
      btnRefreshModels.textContent = btnLabel;
      btnRefreshModels.disabled = false;
    }
  });

  pricingFilter.addEventListener("change", () => {
    if (allModels.length) rebuildModelDropdown();
  });

  providerFilter.addEventListener("change", () => {
    if (allModels.length) rebuildModelDropdown();
  });

  modelList.addEventListener("change", () => {
    currentModel = modelList.value;
    savedModelId = currentModel;
    if (currentModel) {
      try { localStorage.setItem(MODEL_STORAGE, currentModel); } catch (e) {}
    }
  });

  /* =======================================================================
     PROMPT BUILDING
     ======================================================================= */
  function buildPrompt() {
    const mode = modeSelect.value;
    const source = inputText.value.trim();

    if (mode === "rewrite") {
      const styleDef = STYLES[rewriteStyle.value];
      const intensityKey = intensity.value;
      const intensityDef = INTENSITY[intensityKey];
      const intensityLabel = intensityKey.charAt(0).toUpperCase() + intensityKey.slice(1);

      return [
        "You are a text transformer. Rewrite the user's source text according to the style and intensity below.",
        "",
        "STYLE: " + styleDef.name,
        styleDef.description,
        "",
        "INTENSITY: " + intensityLabel,
        intensityDef,
        "",
        "RULES:",
        "- Preserve the meaning and all factual content of the source.",
        "- Do not add information that is not present in the source.",
        "- Do not add a preamble, title, header, or explanation.",
        "- Do not wrap the output in quotes or code blocks.",
        "- Output the rewritten text alone — nothing before it, nothing after it.",
        "",
        "SOURCE TEXT:",
        source
      ].join("\n");
    }

    if (mode === "prompt") {
      const targetDef = PROMPT_TARGETS[promptTarget.value];
      const depthDef = PROMPT_DEPTHS[promptDepth.value];
      const depthLabel = promptDepth.value.charAt(0).toUpperCase() + promptDepth.value.slice(1);

      return [
        "You are a prompt engineer. Transform the user's rough input into a well-engineered prompt for the target below.",
        "",
        "TARGET: " + targetDef.name,
        targetDef.description,
        "",
        "DEPTH: " + depthLabel,
        depthDef,
        "",
        "RULES:",
        "- Output the engineered prompt alone.",
        "- Do not add a preamble, explanation, or commentary.",
        "- Do not wrap the output in quotes or code blocks.",
        "- Do not include meta-instructions about how to use the prompt.",
        "",
        "USER'S ROUGH INPUT:",
        source
      ].join("\n");
    }

    return "";
  }

  /* =======================================================================
     TRANSFORM
     ======================================================================= */
  btnTransform.addEventListener("click", async () => {
    const source = inputText.value.trim();
    if (!source) {
      showStatus("Type or paste some text first.", "error");
      return;
    }

    const key = (localStorage.getItem(KEY_STORAGE) || "").trim();
    if (!key) {
      showStatus("Save your OpenRouter API key first.", "error");
      return;
    }

    if (!currentModel) {
      showStatus("Pick a model from the dropdown first.", "error");
      return;
    }

    const originalLabel = btnTransform.textContent;
    btnTransform.disabled = true;
    btnTransform.textContent = "Working…";
    showStatus("Sending to " + prettyModelName(currentModel) + "…", "");
    outputText.textContent = "Working…";
    outputMeta.textContent = "";
    btnCopyOutput.disabled = true;
    btnSaveOutput.disabled = true;

    try {
      const prompt = buildPrompt();
      const temperature = getTemperature();

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: currentModel,
          temperature: temperature,
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = "HTTP " + res.status;
        try {
          const j = JSON.parse(errText);
          if (j.error && j.error.message) msg += " — " + j.error.message;
        } catch (e) {
          msg += " — " + errText.slice(0, 200);
        }
        throw new Error(msg);
      }

      const json = await res.json();
      const text =
        json.choices && json.choices[0] && json.choices[0].message &&
        json.choices[0].message.content || "";

      if (!text) throw new Error("Model returned an empty response.");

      lastOutput = text.trim();
      outputText.textContent = lastOutput;

      const chars = lastOutput.length;
      const words = lastOutput.split(/\s+/).filter(Boolean).length;
      outputMeta.textContent = `${chars} chars · ${words} words · ${prettyModelName(currentModel)} · temp ${temperature}`;

      btnCopyOutput.disabled = false;
      btnSaveOutput.disabled = false;

      showStatus("Done.", "success");
      setTimeout(hideStatus, 2200);

    } catch (e) {
      console.warn("Transform failed:", e);
      const msg = e.message || String(e);
      outputText.textContent = "Transform failed:\n\n" + msg;
      outputMeta.textContent = "";
      showStatus("Transform failed. See output panel.", "error");
      lastOutput = "";
      btnCopyOutput.disabled = true;
      btnSaveOutput.disabled = true;
    } finally {
      btnTransform.disabled = false;
      btnTransform.textContent = originalLabel;
    }
  });

  /* =======================================================================
     COPY OUTPUT
     ======================================================================= */
  btnCopyOutput.addEventListener("click", async () => {
    if (!lastOutput) return;
    try {
      await navigator.clipboard.writeText(lastOutput);
      const orig = btnCopyOutput.textContent;
      btnCopyOutput.textContent = "Copied!";
      setTimeout(() => { btnCopyOutput.textContent = orig; }, 1200);
      showStatus("Copied to clipboard.", "success");
      setTimeout(hideStatus, 1500);
    } catch (e) {
      prompt("Copy the output below:", lastOutput);
    }
  });

  /* =======================================================================
     DERIVE FILENAME FROM INPUT
     ======================================================================= */
  const STOPWORDS = new Set([
    "the","a","an","and","or","but","of","to","in","on","at","is","are","was",
    "were","be","been","being","have","has","had","do","does","did","will",
    "would","could","should","may","might","must","can","i","you","he","she",
    "it","we","they","me","my","your","his","her","its","our","their","this",
    "that","these","those","for","from","with","by","as","if","so","not","no",
    "yes","just","very","really","about","into","over","under","like","want",
    "need","make","made","get","got","been","being"
  ]);

  function deriveFilename() {
    const src = (inputText.value || "").toLowerCase();
    const words = src.match(/[a-z0-9]+/g) || [];
    const meaningful = words.filter(w => w.length >= 3 && !STOPWORDS.has(w));

    if (meaningful.length >= 1) {
      const picked = meaningful.slice(0, 3).join("-");
      const trimmed = picked.substring(0, 40).replace(/-+$/, "");
      if (trimmed.length >= 3) return trimmed;
    }

    fallbackCounter++;
    return "transformer-" + String(fallbackCounter).padStart(3, "0");
  }

  /* =======================================================================
     SAVE OUTPUT
     ======================================================================= */
  btnSaveOutput.addEventListener("click", () => {
    if (!lastOutput) return;
    const base = deriveFilename();
    const blob = new Blob([lastOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = base + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showStatus("Saved as " + base + ".txt", "success");
    setTimeout(hideStatus, 2500);
  });

  /* =======================================================================
     HELPERS
     ======================================================================= */
  function prettyModelName(id) {
    if (!id) return "unknown";
    const parts = id.split("/");
    const name = parts[parts.length - 1] || id;
    return name
      .replace(/[-_]/g, " ")
      .replace(/:\w+$/, "")
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  /* =======================================================================
     INIT
     ======================================================================= */
  function init() {
    loadKey();
    updateModeVisibility();

    try {
      const saved = localStorage.getItem(MODEL_STORAGE);
      if (saved) {
        savedModelId = saved;
        currentModel = saved;
      }
    } catch (e) {}
  }

  init();

})();