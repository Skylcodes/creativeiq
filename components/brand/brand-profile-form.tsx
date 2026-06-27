"use client";

import { BulletListEditor } from "@/components/brand/bullet-list-editor";
import { EditableField } from "@/components/brand/editable-field";
import type { BrandProfileForm } from "@/lib/brand-profile/form";

type BrandProfileFormSectionsProps = {
  form: BrandProfileForm;
  onChange: (form: BrandProfileForm) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
};

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-7 md:px-8 md:py-8">
      <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function BrandProfileFormSections({
  form,
  onChange,
  fieldErrors,
  disabled = false,
}: BrandProfileFormSectionsProps) {
  function patch(partial: Partial<BrandProfileForm>) {
    onChange({ ...form, ...partial });
  }

  return (
    <div className="dash-card divide-y divide-white/[0.08] overflow-hidden">
      <SectionBlock title="Brand basics">
        <div className="grid gap-5 md:grid-cols-2">
          <EditableField
            label="Brand name"
            value={form.brandName}
            onChange={(brandName) => patch({ brandName })}
            placeholder="GlowSkin Co."
            disabled={disabled}
            error={fieldErrors?.brandName}
          />
          <EditableField
            label="Product category"
            value={form.category}
            onChange={(category) => patch({ category })}
            placeholder="Skincare, Supplements, Apparel…"
            disabled={disabled}
          />
        </div>

        <EditableField
          label="Website URL"
          value={form.websiteUrl}
          onChange={(websiteUrl) => patch({ websiteUrl })}
          placeholder="https://yourbrand.com"
          hint="Use Refresh from website after changing this URL."
          disabled={disabled}
          error={fieldErrors?.websiteUrl}
        />

        <EditableField
          label="Brand tone"
          value={form.toneOfVoice}
          onChange={(toneOfVoice) => patch({ toneOfVoice })}
          placeholder="Bold and direct, Warm and educational…"
          disabled={disabled}
        />
      </SectionBlock>

      <SectionBlock title="Value propositions">
        <BulletListEditor
          label="Key value props"
          items={form.coreValuePropositions}
          onChange={(coreValuePropositions) => patch({ coreValuePropositions })}
          placeholder="Ships in 24 hours, dermatologist-formulated…"
          maxItems={8}
          disabled={disabled}
        />
      </SectionBlock>

      <SectionBlock title="Target customer">
        <EditableField
          label="Customer description"
          value={form.targetCustomer}
          onChange={(targetCustomer) => patch({ targetCustomer })}
          placeholder="Health-conscious women 28–45 who've tried drugstore skincare…"
          multiline
          disabled={disabled}
        />

        <EditableField
          label="Age range"
          value={form.targetCustomerAgeRange}
          onChange={(targetCustomerAgeRange) => patch({ targetCustomerAgeRange })}
          placeholder="25–45"
          disabled={disabled}
        />

        <BulletListEditor
          label="Pain points"
          items={form.targetCustomerPainPoints}
          onChange={(targetCustomerPainPoints) =>
            patch({ targetCustomerPainPoints })
          }
          placeholder="Adult acne that won't go away…"
          disabled={disabled}
        />

        <BulletListEditor
          label="Desires"
          items={form.targetCustomerDesires}
          onChange={(targetCustomerDesires) => patch({ targetCustomerDesires })}
          placeholder="Clear skin without a 10-step routine…"
          disabled={disabled}
        />
      </SectionBlock>

      <SectionBlock title="Offer">
        <div className="grid gap-5 md:grid-cols-2">
          <EditableField
            label="Price point"
            value={form.offerPricePoint}
            onChange={(offerPricePoint) => patch({ offerPricePoint })}
            placeholder="$49 one-time, $29/month…"
            disabled={disabled}
          />
          <EditableField
            label="Guarantee"
            value={form.offerGuarantee}
            onChange={(offerGuarantee) => patch({ offerGuarantee })}
            placeholder="30-day money back guarantee"
            disabled={disabled}
          />
        </div>

        <BulletListEditor
          label="Offer elements"
          items={form.offerKeyElements}
          onChange={(offerKeyElements) => patch({ offerKeyElements })}
          placeholder="Free shipping, Bundle discount…"
          disabled={disabled}
        />
      </SectionBlock>

      <SectionBlock title="Social proof">
        <EditableField
          label="Proof available"
          value={form.socialProofAvailability}
          onChange={(socialProofAvailability) =>
            patch({ socialProofAvailability })
          }
          placeholder="500+ verified reviews, 4.8 stars…"
          disabled={disabled}
        />

        <BulletListEditor
          label="Notable claims"
          items={form.notableClaims}
          onChange={(notableClaims) => patch({ notableClaims })}
          placeholder="94% saw clearer skin in 30 days…"
          disabled={disabled}
        />
      </SectionBlock>
    </div>
  );
}
