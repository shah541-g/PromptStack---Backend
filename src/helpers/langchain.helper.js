import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";


class Blackbox extends ChatOpenAI {
  constructor(apiKey, modelName = "gpt-3.5-turbo", temperature = 0.7) {
    super({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: temperature,
      baseURL: "https://api.blackbox.com/v1",
      defaultHeaders: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.temperature = temperature;
  }

  
  updateConfig(config) {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.modelName) this.modelName = config.modelName;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    
    this.openAIApiKey = this.apiKey;
    this.modelName = this.modelName;
    this.temperature = this.temperature;
  }

  
  getModelInfo() {
    return {
      modelName: this.modelName,
      temperature: this.temperature,
      provider: "Blackbox"
    };
  }

  
  async testConnection() {
    try {
      const response = await this.invoke([new HumanMessage("Hello, this is a test message.")]);
      return response && response.content && response.content.length > 0;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

export default Blackbox;
