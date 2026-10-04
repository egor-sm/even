import { type Band, bandsStore, findBand, selectionStore, typeIndex } from '~/entities/band';
import { native, type Section, toSections } from '~/shared/api';

import { previewedType, subscribePreviewedType } from './type-preview';

/**
 * Sections of the selected band with the previewed type, asked from C++ (previewBand) whenever the
 * band or the type changes; late answers are dropped. Calls onChange when the preview changes.
 */
export class GhostPreview {
  private preview: { key: string; slot: number; sections: Section[] } | null = null;
  private request = 0;
  private readonly unsubscribe: (() => void)[];

  constructor(private readonly onChange: () => void) {
    this.unsubscribe = [subscribePreviewedType(() => this.update()), bandsStore.subscribe(() => this.update())];
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
  }

  /** The band being previewed and its sections with the other type, if any. */
  current(): { band: Band; sections: Section[] } | null {
    const band = findBand(bandsStore.get().bands, this.preview?.slot ?? null);
    return this.preview === null || band === undefined || previewedType() === null
      ? null
      : { band, sections: this.preview.sections };
  }

  private update(): void {
    const type = previewedType();
    const band = findBand(bandsStore.get().bands, selectionStore.get().selected);
    if (band === undefined || type === null || type === band.type) {
      this.request++;
      if (this.preview !== null) {
        this.preview = null;
        this.onChange();
      }
      return;
    }

    const key = [band.slot, type, band.f, band.g, band.q, band.slope, band.on].join('|');
    if (this.preview?.key === key) return;

    const request = ++this.request;
    void native.previewBand(band.slot, typeIndex(type)).then((result) => {
      if (request !== this.request) return;
      const sections = toSections(result);
      this.preview = sections === null ? null : { key, slot: band.slot, sections };
      this.onChange();
    });
  }
}
