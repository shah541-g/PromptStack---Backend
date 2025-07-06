import axios from 'axios';
import { API_KEYS } from '../config.cjs';

class Blackbox {
  constructor( modelName = "blackboxai/deepseek/deepseek-r1:free", temperature = 0.7) {

    this.apiKey = API_KEYS.BLACKBOX_API_KEY;
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

  async chat(messages, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${retries} to connect to Blackbox API`);
        
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
            },
            timeout: 3000000,
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 300;
            }
          }
        );
        
        console.log(`Successfully connected to Blackbox API on attempt ${attempt}`);
        return response.data;
        
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            throw new Error(`Connection error after ${retries} attempts: ${error.message}. Please check your internet connection and try again.`);
          } else if (error.response) {
            throw new Error(
              `Blackbox API error: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
            );
          } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timed out. The operation took too long to complete.');
          } else {
            throw new Error(`Blackbox API error: ${error.message}`);
          }
        }
        
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
