// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import SetOverview from './SetOverview.svelte';

const list = createRawSnippet(() => ({ render: () => '<p>de lijst</p>' }));

describe('SetOverview', () => {
  it('shows the title and subtitle', () => {
    render(SetOverview, { children: list });
    expect(screen.getByRole('heading', { name: 'Rekenhulp' })).toBeTruthy();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
  });

  it('renders the list below the header', () => {
    render(SetOverview, { children: list });
    expect(screen.getByText('de lijst')).toBeTruthy();
  });
});
