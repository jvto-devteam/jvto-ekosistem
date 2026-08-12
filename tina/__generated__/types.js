export function gql(strings, ...args) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (args[i] || "");
  });
  return str;
}
export const TravelGuidePagePartsFragmentDoc = gql`
    fragment TravelGuidePageParts on TravelGuidePage {
  __typename
  schema_version
  source_type
  domain
  slug
  route
  meta {
    __typename
    route
    title
    browserTitle
    description
    section
    status
    owner
    lastReviewed
    schemaTypes
    faqKey
    summary
  }
  seo {
    __typename
    title
    description
    canonicalRoute
    schemaTypes
  }
  content {
    __typename
    format
    payload {
      __typename
      body_md
      lede
      intro
      readingTime
      hero {
        __typename
        eyebrow
        meta
        heading
        lede
      }
      quickFacts {
        __typename
        key
        label
        value
      }
      temperatureContext {
        __typename
        key
        label
        value
      }
      related {
        __typename
        label
        href
      }
      sections {
        __typename
        id
        title
        sub
        body_md
        body_text
        lede_text
        heading
        heading_accent
        heading_template
        eyebrow
        eyebrow_pill
        eyebrow_meta
        eyebrow_num
        eyebrow_label
        media_tag
        badge_title
        badge_sub
        quote
        quote_attribution
        article_url
        article_date
        sha256_short
        footer_note
        footer_identity
        blocks {
          __typename
          type
          role
          body_md
          src
          alt
          columns
        }
      }
    }
  }
  faq {
    __typename
    key
    payload {
      __typename
      key
      items {
        __typename
        question
        answer
      }
      lastReviewed
      owner
      reviewStatus
    }
  }
  output_targets
  source_trace {
    __typename
    generated_at
    source_files
    migration_note
  }
}
    `;
export const WhyJvtoPagePartsFragmentDoc = gql`
    fragment WhyJvtoPageParts on WhyJvtoPage {
  __typename
  schema_version
  source_type
  domain
  slug
  route
  meta {
    __typename
    route
    title
    browserTitle
    description
    section
    status
    owner
    lastReviewed
    schemaTypes
    faqKey
    summary
  }
  seo {
    __typename
    title
    description
    canonicalRoute
    schemaTypes
  }
  content {
    __typename
    format
    payload {
      __typename
      body_md
      lede
      intro
      readingTime
      hero {
        __typename
        eyebrow
        meta
        heading
        lede
      }
      quickFacts {
        __typename
        key
        label
        value
      }
      temperatureContext {
        __typename
        key
        label
        value
      }
      related {
        __typename
        label
        href
      }
      sections {
        __typename
        id
        title
        sub
        body_md
        body_text
        lede_text
        heading
        heading_accent
        heading_template
        eyebrow
        eyebrow_pill
        eyebrow_meta
        eyebrow_num
        eyebrow_label
        media_tag
        badge_title
        badge_sub
        quote
        quote_attribution
        article_url
        article_date
        sha256_short
        footer_note
        footer_identity
        blocks {
          __typename
          type
          role
          body_md
          src
          alt
          columns
        }
      }
    }
  }
  faq {
    __typename
    key
    payload {
      __typename
      key
      items {
        __typename
        question
        answer
      }
      lastReviewed
      owner
      reviewStatus
    }
  }
  output_targets
  source_trace {
    __typename
    generated_at
    source_files
    migration_note
  }
}
    `;
export const PolicyPagePartsFragmentDoc = gql`
    fragment PolicyPageParts on PolicyPage {
  __typename
  schema_version
  source_type
  domain
  slug
  route
  meta {
    __typename
    route
    title
    browserTitle
    description
    section
    status
    owner
    lastReviewed
    schemaTypes
    faqKey
    summary
  }
  seo {
    __typename
    title
    description
    canonicalRoute
    schemaTypes
  }
  content {
    __typename
    format
    payload {
      __typename
      body_md
      lede
      intro
      readingTime
      hero {
        __typename
        eyebrow
        meta
        heading
        lede
      }
      quickFacts {
        __typename
        key
        label
        value
      }
      temperatureContext {
        __typename
        key
        label
        value
      }
      related {
        __typename
        label
        href
      }
      sections {
        __typename
        id
        title
        sub
        body_md
        body_text
        lede_text
        heading
        heading_accent
        heading_template
        eyebrow
        eyebrow_pill
        eyebrow_meta
        eyebrow_num
        eyebrow_label
        media_tag
        badge_title
        badge_sub
        quote
        quote_attribution
        article_url
        article_date
        sha256_short
        footer_note
        footer_identity
        blocks {
          __typename
          type
          role
          body_md
          src
          alt
          columns
        }
      }
    }
  }
  faq {
    __typename
    key
    payload {
      __typename
      key
      items {
        __typename
        question
        answer
      }
      lastReviewed
      owner
      reviewStatus
    }
  }
  output_targets
  source_trace {
    __typename
    generated_at
    source_files
    migration_note
  }
}
    `;
export const TravelGuidePageDocument = gql`
    query travelGuidePage($relativePath: String!) {
  travelGuidePage(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...TravelGuidePageParts
  }
}
    ${TravelGuidePagePartsFragmentDoc}`;
export const TravelGuidePageConnectionDocument = gql`
    query travelGuidePageConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: TravelGuidePageFilter) {
  travelGuidePageConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...TravelGuidePageParts
      }
    }
  }
}
    ${TravelGuidePagePartsFragmentDoc}`;
export const WhyJvtoPageDocument = gql`
    query whyJvtoPage($relativePath: String!) {
  whyJvtoPage(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...WhyJvtoPageParts
  }
}
    ${WhyJvtoPagePartsFragmentDoc}`;
export const WhyJvtoPageConnectionDocument = gql`
    query whyJvtoPageConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: WhyJvtoPageFilter) {
  whyJvtoPageConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...WhyJvtoPageParts
      }
    }
  }
}
    ${WhyJvtoPagePartsFragmentDoc}`;
export const PolicyPageDocument = gql`
    query policyPage($relativePath: String!) {
  policyPage(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...PolicyPageParts
  }
}
    ${PolicyPagePartsFragmentDoc}`;
export const PolicyPageConnectionDocument = gql`
    query policyPageConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: PolicyPageFilter) {
  policyPageConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...PolicyPageParts
      }
    }
  }
}
    ${PolicyPagePartsFragmentDoc}`;
export function getSdk(requester) {
  return {
    travelGuidePage(variables, options) {
      return requester(TravelGuidePageDocument, variables, options);
    },
    travelGuidePageConnection(variables, options) {
      return requester(TravelGuidePageConnectionDocument, variables, options);
    },
    whyJvtoPage(variables, options) {
      return requester(WhyJvtoPageDocument, variables, options);
    },
    whyJvtoPageConnection(variables, options) {
      return requester(WhyJvtoPageConnectionDocument, variables, options);
    },
    policyPage(variables, options) {
      return requester(PolicyPageDocument, variables, options);
    },
    policyPageConnection(variables, options) {
      return requester(PolicyPageConnectionDocument, variables, options);
    }
  };
}
import { createClient } from "tinacms/dist/client";
const generateRequester = (client) => {
  const requester = async (doc, vars, options) => {
    let url = client.apiUrl;
    if (options?.branch) {
      const index = client.apiUrl.lastIndexOf("/");
      url = client.apiUrl.substring(0, index + 1) + options.branch;
    }
    const data = await client.request({
      query: doc,
      variables: vars,
      url
    }, options);
    return { data: data?.data, errors: data?.errors, query: doc, variables: vars || {} };
  };
  return requester;
};
export const ExperimentalGetTinaClient = () => getSdk(
  generateRequester(
    createClient({
      url: "http://localhost:4001/graphql",
      queries
    })
  )
);
export const queries = (client) => {
  const requester = generateRequester(client);
  return getSdk(requester);
};
