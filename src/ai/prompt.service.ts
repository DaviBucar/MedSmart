import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class PromptService {
  private summaryTpl: Handlebars.TemplateDelegate;
  private mindMapTpl: Handlebars.TemplateDelegate;
  private questionsTpl: Handlebars.TemplateDelegate;

  constructor() {
    try {
      const base = join(__dirname, 'templates');
      this.summaryTpl = Handlebars.compile(
        readFileSync(join(base, 'pdfSummary.hbs'), 'utf-8'),
      );
      this.mindMapTpl = Handlebars.compile(
        readFileSync(join(base, 'mindMap.hbs'), 'utf-8'),
      );
      this.questionsTpl = Handlebars.compile(
        readFileSync(join(base, 'questions.hbs'), 'utf-8'),
      );
    } catch {
      throw new InternalServerErrorException(
        'Erro ao carregar templates de IA',
      );
    }
  }

  buildPdfSummaryPrompt(text: string): string {
    return this.summaryTpl({ text });
  }

  buildMindMapPrompt(text: string): string {
    return this.mindMapTpl({ text });
  }

  buildQuestionsPrompt(text: string, count: number): string {
    return this.questionsTpl({ text, count });
  }
}
