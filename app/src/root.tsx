import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Progress } from "@mintplex-labs/piper-tts-web";
import * as Comlink from "comlink";

import { processSentences, mergeAudioBlobs, downloadModel } from "./tts";

type State =
  | { phase: "init"; step: "initial" }
  | { phase: "init"; step: "error" }
  | { phase: "model"; step: "initial" }
  | { phase: "model"; step: "loading"; progress: number }
  | { phase: "model"; step: "error" }
  | { phase: "text"; step: "initial" }
  | { phase: "text"; step: "loading" }
  | { phase: "text"; step: "error" }
  | { phase: "audio"; step: "loading"; text: string }
  | { phase: "audio"; step: "error"; text: string }
  | { phase: "audio"; step: "ready"; text: string; audio: HTMLAudioElement };

type SetState = Dispatch<SetStateAction<State>>;

export function Root() {
  const [state, setState] = useState<State>({ phase: "init", step: "initial" });

  console.log("State:", state);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {state.phase === "init" && (
        <InitPhase state={state} setState={setState} />
      )}
      {state.phase === "model" && (
        <ModelPhase state={state} setState={setState} />
      )}
      {state.phase === "text" && (
        <TextPhase state={state} setState={setState} />
      )}
      {state.phase === "audio" && (
        <AudioPhase state={state} setState={setState} />
      )}
    </div>
  );
}

type InitState = Extract<State, { phase: "init" }>;

function InitPhase({
  state,
  setState,
}: {
  state: InitState;
  setState: SetState;
}) {
  useEffect(() => {
    async function init() {
      console.log("Downloading model...");
      await downloadModel();
      console.log("Model downloaded");

      const sentences = await getText();
      const audioBlobs = await processSentences(sentences);
      const audio = mergeAudioBlobs(audioBlobs);

      audio.play();
    }

    init();
  }, []);
  // useEffect(() => {
  //   async function init() {
  //     try {
  //       const stored = await tts.getStored();

  //       console.log("Stored voices:", stored);

  //       if (stored.length > 0) {
  //         await tts.initSession(voiceId);
  //         setState({ phase: "text", step: "initial" });
  //       } else {
  //         setState({ phase: "model", step: "initial" });
  //       }
  //     } catch (error) {
  //       console.error("Error initializing TTS:", error);
  //       setState({ phase: "init", step: "error" });
  //     }
  //   }

  //   init();
  // }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.step === "error") {
    return (
      <div>
        <p>Error initializing</p>
      </div>
    );
  }

  return null;
}

type ModelState = Extract<State, { phase: "model" }>;

function ModelPhase({
  state,
  setState,
}: {
  state: ModelState;
  setState: SetState;
}) {
  async function load() {
    setState({ phase: "model", step: "loading", progress: 0 });

    const onProgress = Comlink.proxy((p: Progress) => {
      const progress = p.loaded / p.total;
      setState({ phase: "model", step: "loading", progress });
    });

    try {
      await tts.initSession(voiceId, onProgress);
      setState({ phase: "text", step: "initial" });
    } catch (error) {
      console.error("Error initializing TTS session:", error);
      setState({ phase: "model", step: "error" });
    }
  }

  if (state.step === "loading") {
    return (
      <div>
        <p>Loading model...</p>
        <progress value={state.progress} max={1} />
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div>
        <p>Error loading model</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={load}>Load model</button>
    </div>
  );
}

type TextState = Extract<State, { phase: "text" }>;

function TextPhase({
  state,
  setState,
}: {
  state: TextState;
  setState: SetState;
}) {
  async function load() {
    setState({ phase: "text", step: "loading" });

    try {
      const text = await getText();
      setState({ phase: "audio", step: "loading", text });
    } catch (error) {
      console.error("Error loading text:", error);
      setState({ phase: "text", step: "error" });
    }
  }

  if (state.step === "loading") {
    return (
      <div>
        <p>Loading text...</p>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div>
        <p>Error loading text</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={load}>Load text</button>
    </div>
  );
}

type AudioState = Extract<State, { phase: "audio" }>;

function AudioPhase({
  state,
  setState,
}: {
  state: AudioState;
  setState: SetState;
}) {
  useEffect(() => {
    async function load() {
      try {
        setState({ phase: "audio", step: "loading", text: state.text });

        const result = await tts.getAudio(state.text);

        if (!result.audio) {
          throw new Error(result.message);
        }

        const audio = new Audio(URL.createObjectURL(result.audio));
        setState({ phase: "audio", step: "ready", text: state.text, audio });
      } catch (error) {
        console.error("Error getting audio:", error);
        setState({ phase: "audio", step: "error", text: state.text });
      }
    }

    load();
  }, [state.text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.step === "loading") {
    return (
      <div>
        <p>Loading audio...</p>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div>
        <p>Error loading audio</p>
      </div>
    );
  }

  if (state.step === "ready") {
    return (
      <div>
        <Player audio={state.audio} />
      </div>
    );
  }
}

function Player({ audio }: { audio: HTMLAudioElement }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <button onClick={() => audio.play()}>Play</button>
      <button onClick={() => audio.pause()}>Pause</button>
      <button onClick={() => (audio.currentTime = 0)}>Reset</button>
      <button
        onClick={() => {
          audio.playbackRate = 1.5;
          audio.play();
        }}
      >
        Increase speed
      </button>
      <button
        onClick={() => {
          audio.playbackRate = 0.5;
          audio.play();
        }}
      >
        Decrease speed
      </button>
    </div>
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fixMissingSentenceSpacing(text: string): string {
  return text.replace(/([a-z])\.([A-Z])/g, "$1. $2");
}

async function getText() {
  const text = fixMissingSentenceSpacing(
    `5 min readDec 17, 2024Real-world data from MERJ and Vercel shows distinct patterns from top AI crawlers.AI crawlers have become a significant presence on the web. OpenAI's GPTBot generated 569 million requests across Vercel's network in the past month, while Anthropic's Claude followed with 370 million. For perspective, this combined volume represents about 20% of Googlebot's 4.5 billion requests during the same period.After analyzing how Googlebot handles JavaScript rendering with MERJ, we turned our attention to these AI assistants. Our new data reveals how Open AI’s ChatGPT, Anthropic’s Claude, and other AI tools crawl and process web content.We uncovered clear patterns in how these crawlers handle JavaScript, prioritize content types, and navigate the web, which directly impact how AI tools understand and interact with modern web applications.Data collection processOur primary data comes from monitoring nextjs.org and the Vercel network for the past few months. To validate our findings across different technology stacks, we also analyzed two job board websites: Resume Library, built with Next.js, and CV Library, which uses a custom monolithic framework. This diverse dataset helps ensure our observations about crawler behavior are consistent across different web architectures.For more details on how we collected this data, see our first article.Note: Microsoft Copilot was excluded from this study as it lacks a unique user agent for tracking.Scale and distributionThe volume of AI crawler traffic across Vercel's network is substantial. In the past month:Googlebot: 4.5 billion fetches across Gemini and SearchGPTBot (ChatGPT): 569 million fetchesClaude: 370 million fetchesAppleBot: 314 million fetchesPerplexityBot: 24.4 million fetchesWhile AI crawlers haven't reached Googlebot's scale, they represent a significant portion of web crawler traffic. For context, GPTBot, Claude, AppleBot, and PerplexityBot combined account for nearly 1.3 billion fetches—a little over 28% of Googlebot's volume.Geographic distributionAll AI crawlers we measured operate from U.S. data centers:ChatGPT: Des Moines (Iowa), Phoenix (Arizona)Claude: Columbus (Ohio)In comparison, traditional search engines often distribute crawling across multiple regions. For example, Googlebot operates from seven different U.S. locations, including The Dalles (Oregon), Council Bluffs (Iowa), and Moncks Corner (South Carolina).JavaScript rendering capabilitiesOur analysis shows a clear divide in JavaScript rendering capabilities among AI crawlers. To validate our findings, we analyzed both Next.js applications and traditional web applications using different tech stacks.The results consistently show that none of the major AI crawlers currently render JavaScript. This includes:OpenAI (OAI-SearchBot, ChatGPT-User, GPTBot)Anthropic (ClaudeBot)Meta (Meta-ExternalAgent)ByteDance (Bytespider)Perplexity (PerplexityBot)The results also show:Google's Gemini leverages Googlebot's infrastructure, enabling full JavaScript rendering.AppleBot renders JavaScript through a browser-based crawler, similar to Googlebot. It processes JavaScript, CSS, Ajax requests, and other resources needed for full-page rendering.Common Crawl (CCBot), which is often used as a training dataset for Large Language Models (LLMs) does not render pages.The data indicates that while ChatGPT and Claude crawlers do fetch JavaScript files (ChatGPT: 11.50%, Claude: 23.84% of requests), they don't execute them. They can't read client-side rendered content.Note, however, that content included in the initial HTML response, like JSON data or delayed React Server Components, may still be indexed since AI models can interpret non-HTML content.In contrast, Gemini's use of Google's infrastructure gives it the same rendering capabilities we documented in our Googlebot analysis, allowing it to process modern web applications fully.Content type prioritiesAI crawlers show distinct preferences in the types of content they fetch on nextjs.org. The most notable patterns:ChatGPT prioritizes HTML content (57.70% of fetches)Claude focuses heavily on images (35.17% of total fetches)Both crawlers spend significant time on JavaScript files (ChatGPT: 11.50%, Claude: 23.84%) despite not executing themFor comparison, Googlebot's fetches (across Gemini and Search) are more evenly distributed:31.00% HTML content29.34% JSON data20.77% plain text15.25% JavaScriptThese patterns suggest AI crawlers collect diverse content types—HTML, images, and even JavaScript files as text—likely to train their models on various forms of web content.While traditional search engines like Google have optimized their crawling patterns specifically for search indexing, newer AI companies may still be refining their content prioritization strategies.Crawling (in)efficiencyOur data shows significant inefficiencies in AI crawler behavior:ChatGPT spends 34.82% of its fetches on 404 pagesClaude shows similar patterns with 34.16% of fetches hitting 404sChatGPT spends an additional 14.36% of fetches following redirectsAnalysis of 404 errors reveals that, excluding robots.txt, these crawlers frequently attempt to fetch outdated assets from the /static/ folder. This suggests a need for improved URL selection and handling strategies to avoid unnecessary requests.These high rates of 404s and redirects contrast sharply with Googlebot, which spends only 8.22% of fetches on 404s and 1.49% on redirects, suggesting Google has spent more time optimizing its crawler to target real resources.Traffic correlation analysisOur analysis of traffic patterns reveals interesting correlations between crawler behavior and site traffic. Based on data from nextjs.org:Pages with higher organic traffic receive more frequent crawler visitsAI crawlers show less predictable patterns in their URL selectionHigh 404 rates suggest AI crawlers may need to improve their URL selection and validation processes, though the exact cause remains unclearWhile traditional search engines have developed sophisticated prioritization algorithms, AI crawlers are seemingly still evolving their approach to web content discovery.Our research with Vercel highlights that AI crawlers, while rapidly scaling, continue to face significant challenges in handling JavaScript and efficiently crawling content. As the adoption of AI-driven web experiences continues to gather pace, brands must ensure that critical information is server-side rendered and that their sites remain well-optimized to sustain visibility in an increasingly diverse search landscape.Ryan Siddle,  Managing Director of MERJRecommendationsFor site owners who want to be crawledPrioritize server-side rendering for critical content. ChatGPT and Claude don't execute JavaScript, so any important content should be server-rendered. This includes main content (articles, product information, documentation), meta information (titles, descriptions, categories), and navigation structures. SSR, ISR, and SSG keep your content accessible to all crawlers.Client-side rendering still works for enhancement features. Feel free to use client-side rendering for non-essential dynamic elements like view counters, interactive UI enhancements, live chat widgets, and social media feeds.Efficient URL management matters more than ever. The high 404 rates from AI crawlers highlight the importance of maintaining proper redirects, keeping sitemaps up to date, and using consistent URL patterns across your site.For site owners who don't want to be crawledUse robots.txt to control crawler access. The robots.txt file is effective for all measured crawlers. Set specific rules for AI crawlers by specifying their user agent or product token to restrict access to sensitive or non-essential content. To find the user agents to disallow, you’ll need to look in each company’s own documentation (for example, Applebot and OpenAI’s crawlers).Block AI crawlers with Vercel's WAF. Our Block AI Bots Firewall Rule lets you block AI crawlers with one click. This rule automatically configures your firewall to deny their access.For AI usersJavaScript-rendered content may be missing. Since ChatGPT and Claude don't execute JavaScript, their responses about dynamic web applications may be incomplete or outdated.Consider the source. High 404 rates (>34%) mean that when AI tools cite specific web pages, there's a significant chance those URLs are incorrect or inaccessible. For critical information, always verify sources directly rather than relying on AI-provided links.Expect inconsistent freshness. While Gemini leverages Google's infrastructure for crawling, other AI assistants show less predictable patterns. Some may reference older cached data.Interestingly, even when asking Claude or ChatGPT for fresh Next.js docs data, we often don't see immediate fetches in our server logs for nextjs.org. This suggests that AI models may rely on cached data or training data, even when they claim to have fetched the latest information.Final thoughtsOur analysis reveals that AI crawlers have quickly become a significant presence on the web, with nearly 1 billion monthly requests across Vercel's network.However, their behavior differs markedly from traditional search engines, when it comes to rendering capabilities, content priorities, and efficiency. Following established web development best practices—particularly around content accessibility—remains crucial.`
  );

  const sentences = splitIntoSentences(text);

  await sleep(1000);

  return sentences;
}

function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}
