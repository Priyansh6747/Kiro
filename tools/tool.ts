import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

// ─────────────────────────────────────────────────────────────
// Tool Implementations (mocked)
// ─────────────────────────────────────────────────────────────

export async function getWeather({ location }: { location: string }) {
  console.log(`Executing getWeather for location: ${location}`);
  const conditions = ["Sunny", "Cloudy", "Rainy", "Windy", "Snowy"];
  return {
    temperature: Math.floor(Math.random() * 40) + 50, // 50-90
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    location,
  };
}

export async function getRainfall({
                                    location,
                                  }: {
  location: string;
}): Promise<{ location: string; mm: number }> {
  console.log(`Executing getRainfall for location: ${location}`);
  return { location, mm: Math.floor(Math.random() * 60) };
}

export async function getForecast({
                                    location,
                                    days = 3,
                                  }: {
  location: string;
  days?: number;
}) {
  console.log(`Executing getForecast for ${location}, ${days} days`);
  const conditions = ["Sunny", "Cloudy", "Rainy", "Windy"];
  const forecast = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    high: Math.floor(Math.random() * 30) + 60,
    low: Math.floor(Math.random() * 20) + 40,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
  }));
  return { location, forecast };
}

export async function convertTemperature({
                                           value,
                                           from,
                                           to,
                                         }: {
  value: number;
  from: "celsius" | "fahrenheit";
  to: "celsius" | "fahrenheit";
}) {
  console.log(`Executing convertTemperature: ${value} ${from} -> ${to}`);
  if (from === to) return { value, unit: to };
  const result =
      from === "celsius" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  return { value: Math.round(result * 100) / 100, unit: to };
}

export async function searchCities({
                                     query,
                                     limit = 5,
                                   }: {
  query: string;
  limit?: number;
}) {
  console.log(`Executing searchCities for query: ${query}`);
  const mockCities = [
    { name: "San Francisco, CA", country: "US", lat: 37.77, lon: -122.42 },
    { name: "Seattle, WA", country: "US", lat: 47.61, lon: -122.33 },
    { name: "Jaipur, RJ", country: "IN", lat: 26.91, lon: 75.79 },
    { name: "Tokyo", country: "JP", lat: 35.68, lon: 139.69 },
    { name: "London", country: "GB", lat: 51.51, lon: -0.13 },
  ];
  const results = mockCities
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  return { query, results: results.length ? results : mockCities.slice(0, limit) };
}

export async function setWeatherAlert({
                                        location,
                                        threshold,
                                        type,
                                      }: {
  location: string;
  threshold: number;
  type: "rainfall" | "temperature" | "wind";
}) {
  console.log(`Executing setWeatherAlert for ${location}`);
  return {
    alertId: `alert_${Math.random().toString(36).slice(2, 9)}`,
    location,
    threshold,
    type,
    status: "active",
  };
}

// ─────────────────────────────────────────────────────────────
// Tool Schemas (MCP/OpenAI function-calling format)
// ─────────────────────────────────────────────────────────────

export const weatherToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getWeather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
      },
      required: ["location"],
    },
  },
};

export const rainfallToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getRainfall",
    description: "Get the current rainfall amount for a location in millimeters",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. Seattle, WA",
        },
      },
      required: ["location"],
    },
  },
};

export const forecastToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getForecast",
    description: "Get a multi-day weather forecast for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. Austin, TX",
        },
        days: {
          type: "number",
          description: "Number of days to forecast (default 3, max 7)",
        },
      },
      required: ["location"],
    },
  },
};

export const convertTemperatureToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "convertTemperature",
    description: "Convert a temperature value between Celsius and Fahrenheit",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "number",
          description: "The temperature value to convert",
        },
        from: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "The unit to convert from",
        },
        to: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "The unit to convert to",
        },
      },
      required: ["value", "from", "to"],
    },
  },
};

export const searchCitiesToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "searchCities",
    description: "Search for cities matching a query string, returning coordinates",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Partial or full city name to search for",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 5)",
        },
      },
      required: ["query"],
    },
  },
};

export const setWeatherAlertToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "setWeatherAlert",
    description: "Create a weather alert that triggers when a threshold is crossed",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. Miami, FL",
        },
        threshold: {
          type: "number",
          description: "The numeric threshold that triggers the alert",
        },
        type: {
          type: "string",
          enum: ["rainfall", "temperature", "wind"],
          description: "The metric to monitor",
        },
      },
      required: ["location", "threshold", "type"],
    },
  },
};

// ─────────────────────────────────────────────────────────────
// Exports: tool list + handler map
// ─────────────────────────────────────────────────────────────

export const tools: ChatCompletionTool[] = [
  weatherToolSchema,
  rainfallToolSchema,
  forecastToolSchema,
  convertTemperatureToolSchema,
  searchCitiesToolSchema,
  setWeatherAlertToolSchema,
  // Add other tools here
];

export const toolHandlers: Record<string, Function> = {
  getWeather,
  getRainfall,
  getForecast,
  convertTemperature,
  searchCities,
  setWeatherAlert,
};

