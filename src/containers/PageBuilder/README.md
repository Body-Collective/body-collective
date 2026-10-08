## PageBuilder

PageBuilder creates a page according to a page data asset. The page asset represents all the content
that the page needs and how they are grouped together (excluding the top bar and footer).

The page asset file is created in Sharetribe Console against the page asset schema. When comparing
this solution with headless CMS services, the schema of the page asset represents the result of
**content modeling**. It defines what kind of data needs to be asked from a content writer. In
Sharetribe Marketplaces, content writing happens in Console, which means that content writers are
marketplace operators.

The smallest piece of information in page asset is a field. It defines a piece of data and its
fieldType. For example:

```json
"title": {
  "fieldType": "heading1",
  "content": "Hello World"
}
```

The default asset schema for page content has 3 levels that can include content fields:

- **page asset** (data from Asset Delivery API)
  - **sections** (UI: an array of sections)
    - **blocks** (UI: section might contain an array of blocks)
  - _meta_ (metadata for the page aka data for `<head>` element)

**PageBuilder** reads the page asset, and when it gets to the _sections_ array, it uses
**SectionBuilder** to render its content. Similarly, SectionBuilder passes _blocks_ array to
**BlockBuilder**. All the fields are passed to the **Field** component, which validates and
sanitizes the data and uses **Primitive** components to actually render them. **MarkdownProcessor**
is used to render fields with `"fieldType": "markdown"`.

Then **LayoutComposer** creates the layout areas for **Topbar**, **Footer**, and for the main
content, which is created using a page asset.

In addition, the **StaticPage** component wraps everything and adds the page context using
[React Helmet Async](https://github.com/staylor/react-helmet-async) library. It sets the title,
description, SEO schema, and social media meta tags to the `<head>` section of the page. There are
also other responsibilities that StaticPage takes care of.

## Props

- **pageAssetsData**: denormalized page asset data (e.g. image refs are swapped to imageAsset
  entities)
- **inProgress**: status of Asset Delivery API call to fetch the asset
- **fallbackPage**: if asset fetch fails, you can provide a fallback component
- **options**: possibility to extend built-in sections, blocks, and fields.
- All the other props are given to the **StaticPage** component, which PageBuilder uses internally.

## Image loading

**SectionBuilder** sets loading hints on section options. **FieldImage** and section background
images (**CustomAppearance**) consume them.

- **Lazy loading**: sections from index 2 onward defer mounting images until near the viewport
  (IntersectionObserver, ~1 viewport prefetch). The first two sections still SSR with images
  mounted. Tune via `LAZY_IMAGES_FROM_SECTION_INDEX` in `PageBuilder.helpers.js`.
- **fetchPriority**: the first section’s background image gets `fetchpriority="high"` to favor LCP.
  Block FieldImages do not use this yet.

## Extend PageBuilder

By default, PageBuilder has only one layout that consists of 3 parts: topbar, main, and footer. You
might want to create more layout options using **LayoutComposer**.

It's also possible to create custom section types, block types, and fields - and map those with your
custom components. However, this is only useful if PageBuilder is used to create custom pages that
don't get content through the Asset Delivery API.

```jsx
<PageBuilder
  pageAssetsData={{
    sections: [
      {
        sectionType: 'customHero',
        sectionId: 'hero',
      },
      {
        sectionType: 'customSection',
        sectionId: 'my-ection',
        foo: { fieldType: 'myField', bar: 'bar' },
        blocks: [
          {
            blockType: 'customSectionBlock',
            blockId: 'my-block',
          },
        ],
      },
    ],
    meta: {
      pageTitle: {
        fieldType: 'metaTitle',
        content: 'My Custom Page',
      },
    },
  }}
  options={{
    sectionComponents: {
      customHero: { component: FallbackHero },
      customSection: { component: MyCustomSection },
    },
    blockComponents: {
      customSectionBlock: { component: MyCustomBlock },
    },
    fieldComponents: {
      myField: {
        component: MyCustomField,
        // Expose only "bar" data, drop everything else
        pickValidProps: data => (hasBar(data) ? { bar: data.bar } : {}),
      },
    },
  }}
/>
```

## Region pages

A region page (e.g. `/p/berlin`) shows the practitioners and events of a region, which can be
narrowed down to a neighbourhood. It is a normal content page made in Console, and it is recognised
by the **Anchor link ID** of its sections:

| Section ID             | Template | What it does                                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `region-hero`          | Hero     | Gets a "Body Collective · Region" label above the title. The search field "Location" is replaced by a list of the neighbourhoods. The search opens the search page and does not filter the region page. |
| `region-areas`         | Columns  | The neighbourhoods, as pills. One block per neighbourhood. The page keeps the chosen one in the URL (`?area=mitte`). |
| `region-practitioners` | Listings | A grid of listings, with a count above it. "Listing selection" is a search query.          |
| `region-events`        | Listings | A grid of event cards. The section is left out when there are none.                        |

Blocks of `region-areas`:

- **Block title:** the text of the pill.
- **Anchor link ID:** the value of `?area=` (the title is used when it is empty).
- **Call to action, link address:** the search page URL of the neighbourhood, e.g.
  `/s?address=Mitte%2C+Berlin&bounds=52.54%2C13.42%2C52.50%2C13.36`. Search for the neighbourhood on the
  search page and copy the URL. The listing sections swap the `address` and `bounds` of their query
  for these ones.
- **The first block is the whole region.** It is what the page shows by default. Its **block text**
  finishes the sentence of the count: "8 practitioners *across the city*".

The other sections of the page (about text, call to action) are styled by their ids in
`PageBuilder.module.css`. Code: `util/regionAreas.js`, `RegionAreaContext.js`,
`SectionColumns/RegionAreaPills.js`, `SectionListings/RegionSectionListings.js`.
