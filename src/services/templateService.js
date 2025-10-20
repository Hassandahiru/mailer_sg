import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateService {
  constructor() {
    this.compiledTemplates = {};
    this.templatesPath = path.join(__dirname, '../templates');
  }

  async loadTemplate(templateName) {
    try {
      // Check if template is already compiled
      if (this.compiledTemplates[templateName]) {
        return this.compiledTemplates[templateName];
      }

      // Load and compile template
      const templatePath = path.join(this.templatesPath, templateName, 'template.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      const compiled = handlebars.compile(templateContent);
      this.compiledTemplates[templateName] = compiled;

      logger.info(`Template '${templateName}' loaded and compiled successfully`);
      return compiled;
    } catch (error) {
      logger.error(`Failed to load template '${templateName}':`, error);
      throw new Error(`Template '${templateName}' not found or invalid`);
    }
  }

  async render(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      const html = template(data);

      logger.info(`Template '${templateName}' rendered successfully`);
      return html;
    } catch (error) {
      logger.error(`Failed to render template '${templateName}':`, error);
      throw error;
    }
  }

  async renderWithLayout(templateName, data, layoutName = 'base') {
    try {
      // Render main content
      const content = await this.render(templateName, data);

      // Render with layout
      const layout = await this.loadTemplate(`layouts/${layoutName}`);
      const html = layout({ ...data, content });

      return html;
    } catch (error) {
      logger.error(`Failed to render template '${templateName}' with layout:`, error);
      throw error;
    }
  }

  clearCache() {
    this.compiledTemplates = {};
    logger.info('Template cache cleared');
  }

  async getAvailableTemplates() {
    try {
      const entries = await fs.readdir(this.templatesPath, { withFileTypes: true });
      const templates = entries
        .filter(entry => entry.isDirectory() && entry.name !== 'layouts')
        .map(entry => entry.name);

      return templates;
    } catch (error) {
      logger.error('Failed to get available templates:', error);
      return [];
    }
  }
}

export default new TemplateService();
