import React from 'react';
import '@testing-library/jest-dom';

import { LanguageProvider } from '../../../context/languageContext';
import { renderWithProviders as render } from '../../../util/testHelpers';

import SectionBuilder from './SectionBuilder';

const article = (sectionId, title) => ({
  sectionType: 'article',
  sectionId,
  title: { fieldType: 'heading2', content: title },
  blocks: [],
});

// Each section of a page has a copy for each language: the anchor id ends with the language
const sections = [
  article('intro-en', 'Welcome'),
  article('intro-de', 'Willkommen'),
  article('faq-en', 'Questions'),
  article('faq-de', 'Fragen'),
  article('shared', 'Shared'),
];

const renderPage = (language, pageSections = sections) =>
  render(
    <LanguageProvider initialLanguage={language}>
      <SectionBuilder sections={pageSections} />
    </LanguageProvider>
  );

describe('SectionBuilder languages', () => {
  it('builds the sections in English', () => {
    const { getByText, queryByText } = renderPage('en');

    expect(getByText('Welcome')).toBeInTheDocument();
    expect(getByText('Questions')).toBeInTheDocument();
    expect(queryByText('Willkommen')).not.toBeInTheDocument();
    expect(queryByText('Fragen')).not.toBeInTheDocument();
  });

  it('builds the sections in German', () => {
    const { getByText, queryByText } = renderPage('de');

    expect(getByText('Willkommen')).toBeInTheDocument();
    expect(getByText('Fragen')).toBeInTheDocument();
    expect(queryByText('Welcome')).not.toBeInTheDocument();
    expect(queryByText('Questions')).not.toBeInTheDocument();
  });

  it('builds a section that has no language in all languages', () => {
    ['en', 'de'].forEach(language => {
      const { getByText, unmount } = renderPage(language);
      expect(getByText('Shared')).toBeInTheDocument();
      unmount();
    });
  });

  it('gives the sections ids without the language, so that styles and anchors are the same', () => {
    renderPage('de');

    expect(document.getElementById('intro')).toBeInTheDocument();
    expect(document.getElementById('faq')).toBeInTheDocument();
    expect(document.getElementById('shared')).toBeInTheDocument();
    expect(document.getElementById('intro-de')).not.toBeInTheDocument();
    expect(document.getElementById('intro-en')).not.toBeInTheDocument();
  });

  it('builds the English section when the page has not been translated', () => {
    const onlyEnglish = [article('intro-en', 'Welcome'), article('faq-en', 'Questions')];
    const { getByText } = renderPage('de', onlyEnglish);

    expect(getByText('Welcome')).toBeInTheDocument();
    expect(getByText('Questions')).toBeInTheDocument();
    expect(document.getElementById('intro')).toBeInTheDocument();
  });

  it('is in English without a language provider', () => {
    const { getByText, queryByText } = render(<SectionBuilder sections={sections} />);

    expect(getByText('Welcome')).toBeInTheDocument();
    expect(queryByText('Willkommen')).not.toBeInTheDocument();
  });
});
