# NASA Veda Support

The Visualization, Exploration, and Data Analysis (VEDA) project by NASA is a project built by the Earthdata team to support dataset processing, vusalization, and exploration. One of the key interests of the EASIER team is to enable the geospatial dashboard to seamlessly integrate with other projects in a loosely coupled manner. One way we have demonstrated this is the ability to export a dataset to VEDA frontmatter. The following will walk through the usage of this component.

## Component Overview

When exporting a group of scenes from the Geospatial Dashboard to VEDA, first export the scenes to a configured IPFS Node. From there, with the scenes still selected, an "Export to Veda Frontmatter" button is visible. Clicking this button will bring up a popup with several required fields. As shown below:

![1734125869497](https://easierdata.org/_images/1734125869497.png)

The following fields are defined by the end user:

1. Dataset ID
2. Dataset Name
3. Dataset Caption
4. Dataset Description

Currently, GeoJSON endpoint should be set to the STAC API URL used to view the scenes. Dataset endpoint should route to an IPFS gateway URL that references the CID of the data export. This can easily be retrieved through IPFS Desktop clicking on the three dots on the export under the "Files" tab and selecting "Share link".
