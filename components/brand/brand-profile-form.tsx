"use client";

import { BulletListEditor } from "@/components/brand/bullet-list-editor";
import { EditableField } from "@/components/brand/editable-field";
import { PremiumCard } from "@/components/ui/premium-card";
import type { BrandProfileForm } from "@/lib/brand-profile/form";

type BrandProfileFormSectionsProps = {
  form: BrandProfileForm;
  onChange: (form: BrandProfileForm) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <PremiumCard padding="lg">
      <div className="mb-6 border-b border-[rgba(55,41,111,0.07)] pb-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </PremiumCard>
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
    <div className="space-y-5">
      <Section
        title="Brand Basics"
        description="Core identity signals every analysis agent reads first."
      >
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
          hint="Changing this and clicking Refresh from website will scrape the new URL."
          disabled={disabled}
          error={fieldErrors?.websiteUrl}
        />

        <EditableField
          label="Brand tone"
          value={form.toneOfVoice}
          onChange={(toneOfVoice) => patch({ toneOfVoice })}
          placeholder="Bold and direct, Warm and educational, Premium and aspirational…"
          disabled={disabled}
        />
      </Section>

      <Section
        title="Core Value Propositions"
        description="The key reasons a customer should choose you over alternatives."
      >
        <BulletListEditor
          label="Value propositions"
          items={form.coreValuePropositions}
          onChange={(coreValuePropositions) => patch({ coreValuePropositions })}
          placeholder="Ships in 24 hours, dermatologist-formulated, clinically proven results…"
          maxItems={8}
          disabled={disabled}
        />
      </Section>

      <Section
        title="Target Customer"
        description="Who you're selling to and what they're struggling with."
      >
        <EditableField
          label="Customer description"
          value={form.targetCustomer}
          onChange={(targetCustomer) => patch({ targetCustomer })}
          placeholder="Health-conscious women 28–45 who've tried drugstore skincare without results…"
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
          label="Key pain points"
          items={form.targetCustomerPainPoints}
          onChange={(targetCustomerPainPoints) =>
            patch({ targetCustomerPainPoints })
          }
          placeholder="Adult acne that won't go away, wasted money on products that don't work…"
          disabled={disabled}
        />

        <BulletListEditor
          label="Key desires"
          items={form.targetCustomerDesires}
          onChange={(targetCustomerDesires) => patch({ targetCustomerDesires })}
          placeholder="Clear skin without a 10-step routine, confidence in photos again…"
          disabled={disabled}
        />
      </Section>

      <Section
        title="Offer Structure"
        description="How your offer is priced, packaged, and de-risked."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EditableField
            label="Price point"
            value={form.offerPricePoint}
            onChange={(offerPricePoint) => patch({ offerPricePoint })}
            placeholder="$49 one-time, $29/month subscription…"
            disabled={disabled}
          />
          <EditableField
            label="Guarantee or risk reversal"
            value={form.offerGuarantee}
            onChange={(offerGuarantee) => patch({ offerGuarantee })}
            placeholder="30-day money back guarantee"
            disabled={disabled}
          />
        </div>

        <BulletListEditor
          label="Key offer elements"
          items={form.offerKeyElements}
          onChange={(offerKeyElements) => patch({ offerKeyElements })}
          placeholder="Free shipping, Bundle discount, Limited time bonus…"
          disabled={disabled}
        />
      </Section>

      <Section
        title="Social Proof"
        description="Trust signals and proof points your agents can reference."
      >
        <EditableField
          label="Social proof availability"
          value={form.socialProofAvailability}
          onChange={(socialProofAvailability) =>
            patch({ socialProofAvailability })
          }
          placeholder="500+ verified reviews, 4.8 stars, featured in Vogue…"
          disabled={disabled}
        />

        <BulletListEditor
          label="Notable claims or results"
          items={form.notableClaims}
          onChange={(notableClaims) => patch({ notableClaims })}
          placeholder="94% saw clearer skin in 30 days, 50,000+ customers…"
          disabled={disabled}
        />
      </Section>
    </div>
  );
}
