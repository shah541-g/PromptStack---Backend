import axios from 'axios';

class Blackbox {
  constructor(apiKey, modelName = "blackboxai/deepseek/deepseek-r1:free", temperature = 0.7) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.temperature = temperature;
    this.baseURL = "https://api.blackbox.ai/v1";
  }

  updateConfig(config) {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.modelName) this.modelName = config.modelName;
    if (config.temperature !== undefined) this.temperature = config.temperature;
  }

  getModelInfo() {
    return {
      modelName: this.modelName,
      temperature: this.temperature,
      provider: "Blackbox"
    };
  }

  async chat(messages) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.modelName,
          messages: messages,
          temperature: this.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Blackbox API error: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
        );
      } else {
        throw new Error(`Blackbox API error: ${error.message}`);
      }
    }
  }

  async testConnection() {
    try {
      const result = await this.chat([
        { role: 'user', content: 'Hello, this is a test message.' }
      ]);
      return result && result.choices && result.choices.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }
}

export default Blackbox;
