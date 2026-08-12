// tina/config.ts
import { defineConfig } from "tinacms";
var branch = process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.HEAD || process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || process.env.GITHUB_BRANCH || "main";
var sourceIdentityFields = [
  {
    type: "string",
    name: "schema_version",
    label: "Schema Version"
  },
  {
    type: "string",
    name: "source_type",
    label: "Source Type"
  },
  {
    type: "string",
    name: "domain",
    label: "Domain",
    required: true
  },
  {
    type: "string",
    name: "slug",
    label: "Slug",
    required: true
  },
  {
    type: "string",
    name: "route",
    label: "Route",
    required: true,
    isTitle: true
  }
];
var metaFields = {
  type: "object",
  name: "meta",
  label: "Page Metadata",
  fields: [
    {
      type: "string",
      name: "route",
      label: "Route"
    },
    {
      type: "string",
      name: "title",
      label: "Title"
    },
    {
      type: "string",
      name: "browserTitle",
      label: "Browser Title"
    },
    {
      type: "string",
      name: "description",
      label: "Description",
      ui: {
        component: "textarea"
      }
    },
    {
      type: "string",
      name: "section",
      label: "Section"
    },
    {
      type: "string",
      name: "status",
      label: "Status",
      options: [
        "draft",
        "published",
        "archived"
      ]
    },
    {
      type: "string",
      name: "owner",
      label: "Owner"
    },
    {
      type: "string",
      name: "lastReviewed",
      label: "Last Reviewed"
    },
    {
      type: "string",
      name: "schemaTypes",
      label: "Schema Types",
      list: true
    },
    {
      type: "string",
      name: "faqKey",
      label: "FAQ Key"
    },
    {
      type: "string",
      name: "summary",
      label: "Summary",
      ui: {
        component: "textarea"
      }
    }
  ]
};
var seoFields = {
  type: "object",
  name: "seo",
  label: "SEO",
  fields: [
    {
      type: "string",
      name: "title",
      label: "SEO Title"
    },
    {
      type: "string",
      name: "description",
      label: "SEO Description",
      ui: {
        component: "textarea"
      }
    },
    {
      type: "string",
      name: "canonicalRoute",
      label: "Canonical Route"
    },
    {
      type: "string",
      name: "schemaTypes",
      label: "Schema Types",
      list: true
    }
  ]
};
var linkFields = [
  {
    type: "string",
    name: "label",
    label: "Label"
  },
  {
    type: "string",
    name: "href",
    label: "URL"
  }
];
var keyValueFields = [
  {
    type: "string",
    name: "key",
    label: "Key"
  },
  {
    type: "string",
    name: "label",
    label: "Label"
  },
  {
    type: "string",
    name: "value",
    label: "Value"
  }
];
var payloadSectionBlockFields = [
  {
    type: "string",
    name: "type",
    label: "Type"
  },
  {
    type: "string",
    name: "role",
    label: "Role"
  },
  {
    type: "string",
    name: "body_md",
    label: "Block Markdown Body",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "src",
    label: "Image Source"
  },
  {
    type: "string",
    name: "alt",
    label: "Image Alt Text"
  },
  {
    type: "number",
    name: "columns",
    label: "Columns"
  }
];
var payloadSectionFields = [
  {
    type: "string",
    name: "id",
    label: "Section ID"
  },
  {
    type: "string",
    name: "title",
    label: "Section Title"
  },
  {
    type: "string",
    name: "sub",
    label: "Section Subtitle"
  },
  {
    type: "string",
    name: "body_md",
    label: "Section Markdown Body",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "body_text",
    label: "Section Body Text",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "lede_text",
    label: "Section Lede",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "heading",
    label: "Heading"
  },
  {
    type: "string",
    name: "heading_accent",
    label: "Heading Accent"
  },
  {
    type: "string",
    name: "heading_template",
    label: "Heading Template"
  },
  {
    type: "string",
    name: "eyebrow",
    label: "Eyebrow"
  },
  {
    type: "string",
    name: "eyebrow_pill",
    label: "Eyebrow Pill"
  },
  {
    type: "string",
    name: "eyebrow_meta",
    label: "Eyebrow Meta"
  },
  {
    type: "string",
    name: "eyebrow_num",
    label: "Eyebrow Number"
  },
  {
    type: "string",
    name: "eyebrow_label",
    label: "Eyebrow Label"
  },
  {
    type: "string",
    name: "media_tag",
    label: "Media Tag"
  },
  {
    type: "string",
    name: "badge_title",
    label: "Badge Title"
  },
  {
    type: "string",
    name: "badge_sub",
    label: "Badge Subtitle"
  },
  {
    type: "string",
    name: "quote",
    label: "Quote",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "quote_attribution",
    label: "Quote Attribution"
  },
  {
    type: "string",
    name: "article_url",
    label: "Article URL"
  },
  {
    type: "string",
    name: "article_date",
    label: "Article Date"
  },
  {
    type: "string",
    name: "sha256_short",
    label: "SHA256 Short"
  },
  {
    type: "string",
    name: "footer_note",
    label: "Footer Note",
    ui: {
      component: "textarea"
    }
  },
  {
    type: "string",
    name: "footer_identity",
    label: "Footer Identity"
  },
  {
    type: "object",
    name: "blocks",
    label: "Blocks",
    list: true,
    fields: payloadSectionBlockFields
  }
];
var contentFields = {
  type: "object",
  name: "content",
  label: "Content Payload",
  description: "Editable source payload used by the website renderer. Very complex nested arrays are preserved but not fully exposed until their templates are normalized.",
  fields: [
    {
      type: "string",
      name: "format",
      label: "Content Format"
    },
    {
      type: "object",
      name: "payload",
      label: "Payload",
      fields: [
        {
          type: "string",
          name: "body_md",
          label: "Markdown Body",
          ui: {
            component: "textarea"
          }
        },
        {
          type: "string",
          name: "lede",
          label: "Lede Paragraphs",
          list: true,
          ui: {
            component: "textarea"
          }
        },
        {
          type: "string",
          name: "intro",
          label: "Intro",
          ui: {
            component: "textarea"
          }
        },
        {
          type: "string",
          name: "readingTime",
          label: "Reading Time"
        },
        {
          type: "object",
          name: "hero",
          label: "Hero",
          fields: [
            {
              type: "string",
              name: "eyebrow",
              label: "Eyebrow"
            },
            {
              type: "string",
              name: "meta",
              label: "Meta"
            },
            {
              type: "string",
              name: "heading",
              label: "Heading"
            },
            {
              type: "string",
              name: "lede",
              label: "Lede",
              ui: {
                component: "textarea"
              }
            }
          ]
        },
        {
          type: "object",
          name: "quickFacts",
          label: "Quick Facts",
          list: true,
          fields: keyValueFields
        },
        {
          type: "object",
          name: "temperatureContext",
          label: "Temperature Context",
          list: true,
          fields: keyValueFields
        },
        {
          type: "object",
          name: "related",
          label: "Related Links",
          list: true,
          fields: linkFields
        },
        {
          type: "object",
          name: "sections",
          label: "Sections",
          list: true,
          fields: payloadSectionFields
        }
      ]
    }
  ]
};
var faqFields = {
  type: "object",
  name: "faq",
  label: "FAQ",
  fields: [
    {
      type: "string",
      name: "key",
      label: "FAQ Key"
    },
    {
      type: "object",
      name: "payload",
      label: "FAQ Payload",
      fields: [
        {
          type: "string",
          name: "key",
          label: "Payload Key"
        },
        {
          type: "object",
          name: "items",
          label: "FAQ Items",
          list: true,
          fields: [
            {
              type: "string",
              name: "question",
              label: "Question"
            },
            {
              type: "string",
              name: "answer",
              label: "Answer",
              ui: {
                component: "textarea"
              }
            }
          ]
        },
        {
          type: "string",
          name: "lastReviewed",
          label: "Last Reviewed"
        },
        {
          type: "string",
          name: "owner",
          label: "Owner"
        },
        {
          type: "string",
          name: "reviewStatus",
          label: "Review Status"
        }
      ]
    }
  ]
};
var outputTargetsField = {
  type: "string",
  name: "output_targets",
  label: "Output Targets",
  list: true
};
var sourceTraceField = {
  type: "object",
  name: "source_trace",
  label: "Source Trace",
  fields: [
    {
      type: "string",
      name: "generated_at",
      label: "Generated At"
    },
    {
      type: "string",
      name: "source_files",
      label: "Source Files",
      list: true
    },
    {
      type: "string",
      name: "migration_note",
      label: "Migration Note",
      ui: {
        component: "textarea"
      }
    }
  ]
};
var publicPageFields = [
  ...sourceIdentityFields,
  metaFields,
  seoFields,
  contentFields,
  faqFields,
  outputTargetsField,
  sourceTraceField
];
var config_default = defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public"
    }
  },
  schema: {
    collections: [
      {
        name: "travelGuidePage",
        label: "Travel Guide Pages",
        path: "1-knowledge-and-evidence-core/travel-guide",
        format: "json",
        match: {
          include: "*.source"
        },
        fields: publicPageFields
      },
      {
        name: "whyJvtoPage",
        label: "Why JVTO Pages",
        path: "1-knowledge-and-evidence-core/why-jvto",
        format: "json",
        match: {
          include: "*.source"
        },
        fields: publicPageFields
      },
      {
        name: "policyPage",
        label: "Policy Pages",
        path: "1-knowledge-and-evidence-core/policies",
        format: "json",
        match: {
          include: "*.source"
        },
        fields: publicPageFields
      }
    ]
  }
});
export {
  config_default as default
};
