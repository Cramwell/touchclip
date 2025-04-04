import { PriceHistoryItem, Product } from "@/types";
import { CheerioAPI } from "cheerio";
import { Element } from "domhandler";

const Notification = {
  WELCOME: "WELCOME",
  CHANGE_OF_STOCK: "CHANGE_OF_STOCK",
  LOWEST_PRICE: "LOWEST_PRICE",
  THRESHOLD_MET: "THRESHOLD_MET",
};

const THRESHOLD_PERCENTAGE = 40;

export function extractCategory($: CheerioAPI): string {
  // Extract breadcrumb texts from the Amazon product page
  const title = $("#productTitle").text().trim().toLowerCase();
  const breadcrumbs: string[] = $(
    "ul.a-unordered-list.a-horizontal.a-size-small a.a-link-normal.a-color-tertiary"
  )
    .map((_, el: Element) => $(el).text().trim().toLowerCase())
    .get();

  // Look for the parent category "mobile phones & communication"

  const mpcIndex = breadcrumbs.findIndex((crumb) =>
    crumb.includes("mobile phones & communication")
  );
  const lpIndex = breadcrumbs.findIndex(
    (crumb) => crumb.includes("computers") || crumb.includes("electronics")
  );
  const lpAcc = breadcrumbs.findIndex((crumb) => crumb.includes("Electronics"));
  if (mpcIndex !== -1 && breadcrumbs[mpcIndex + 1]) {
    // Check the breadcrumb immediately following "mobile phones & communication"
    const nextCrumb = breadcrumbs[mpcIndex + 1];
    if (nextCrumb.includes("mobile phones")) {
      return "Phones";
    }
    if (nextCrumb.includes("accessories")) {
      return "Mobile Accessories";
    }
  }
  if (lpIndex !== -1 && breadcrumbs[lpIndex + 1]) {
    // Check the breadcrumb immediately following "mobile phones & communication"
    const nextCrumb = breadcrumbs[lpIndex + 1];
    if (nextCrumb.includes("laptops")) {
      return "Laptops";
    }
    if (nextCrumb.includes("accessories")) {
      return "Laptop Accessories";
    }
  }

  // Other category conditions
  if (
    breadcrumbs.some((crumb) => crumb.includes("traditional laptops")) ||
    (title.includes("apple macbook") &&
      title.includes("ram") &&
      title.includes("ssd"))
  ) {
    return "Laptops";
  }

  if (
    breadcrumbs.some((crumb) => crumb.includes("iphone")) ||
    (title.includes("apple") && title.includes("iphone"))
  ) {
    return "Phones";
  }
  // Default category if none of the conditions match
  return "General";
}

// Shipping costs for each category
const SHIPPING_COSTS: Record<string, number> = {
  Phones: 30,
  Laptops: 35,
  General: 13,
};

// Markup ranges for laptops and phones in AED
const MARKUP_RATES = {
  Phones: [
    { min: 0, max: 49.99, rate: 0.9 },
    { min: 50, max: 99.99, rate: 0.5 },
    { min: 100, max: 149.99, rate: 0.4 },
    { min: 150, max: 199.99, rate: 0.35 },
    { min: 200, max: 499.99, rate: 0.3 },
    { min: 500, max: 999.99, rate: 0.25 },
    { min: 1000, max: 1999.99, rate: 0.23 },
    { min: 2000, max: 3999.99, rate: 0.2 },
    { min: 4000, max: 5000, rate: 0.18 },
    { min: 5001, max: Infinity, rate: 0.15 },
  ],
  Laptops: [
    { min: 0, max: 49.99, rate: 1.2 },
    { min: 50, max: 99.99, rate: 1 },
    { min: 100, max: 149.99, rate: 1 },
    { min: 150, max: 199.99, rate: 0.4 },
    { min: 200, max: 499.99, rate: 0.35 },
    { min: 500, max: 999.99, rate: 0.33 },
    { min: 1000, max: 1999.99, rate: 0.3 },
    { min: 2000, max: 3999.99, rate: 0.25 },
    { min: 4000, max: 5000, rate: 0.22 },
    { min: 5001, max: Infinity, rate: 0.2 },
  ],

  General: [
    { min: 0, max: 49.99, rate: 0.7 },
    { min: 50, max: 99.99, rate: 0.5 },
    { min: 100, max: 149.99, rate: 0.3 },
    { min: 150, max: 199.99, rate: 0.28 },
    { min: 200, max: 499.99, rate: 0.23 },
    { min: 500, max: 999.99, rate: 0.2 },
    { min: 1000, max: 1999.99, rate: 0.18 },
    { min: 2000, max: 3999.99, rate: 0.15 },
    { min: 4000, max: 5000, rate: 0.12 },
    { min: 5001, max: Infinity, rate: 0.8 },
  ],
};

export function extractPrice(category: string, ...elements: string[]) {
  console.log("extractPrice called with category:", category);
  const AED_TO_USD = 0.275; // Conversion rate
  let aedPrice = 0;

  for (const priceText of elements) {
    if (priceText) {
      const cleanPrice = priceText.replace(/[^\d.]/g, ""); // Remove non-numeric characters
      const parsedPrice = parseFloat(cleanPrice);

      if (!isNaN(parsedPrice)) {
        aedPrice = parsedPrice;
        break;
      }
    }
  }

  if (!aedPrice) return ""; // If no valid price is found

  // Price calculation based on category
  const shippingCost = SHIPPING_COSTS[category] || SHIPPING_COSTS.General;
  const markupRanges =
    MARKUP_RATES[category as keyof typeof MARKUP_RATES] || MARKUP_RATES.General;

  const markup =
    markupRanges.find((range) => aedPrice >= range.min && aedPrice <= range.max)
      ?.rate || 0.2;

  const usdPrice = aedPrice * AED_TO_USD;
  const finalPrice = usdPrice + shippingCost + usdPrice * markup;

  console.log("finalPrice:", finalPrice);
  console.log("usdPrice:", usdPrice);
  console.log("shippingCost:", shippingCost);
  console.log("markup:", markup);

  return finalPrice.toFixed(2); // Return price as a string rounded to two decimal places
}

// Extracts and returns the currency symbol from an element.
export function extractCurrency(element: any) {
  // Find all occurrences of 'AED' and return the first one
  const currencyText = element.text().trim().match(/AED/);
  return currencyText ? currencyText[0] : "";
}

export function extractDescription($: CheerioAPI): string {
  const descriptionParts: string[] = [];

  // 2. Extract product details from the table for specific labels
  const validLabels = [
    "Brand",
    "Operating system",
    "screen size",
    "Human interface input",
    "Hard disk size",
    "RAM memory",
    "Installed RAM memory size",
    "Processor brand",
    "Graphics co-processor",
    "Graphics card description",
    "Graphics RAM type",
    "Graphics card interface",
    "Connectivity type",
    "Wireless communication standard",
    "Number of USB 2.0 ports",
    "Number of USB 3.0 ports",
    "Number of HDMI ports",
    "Number of audio-out ports",
    "Number of Ethernet ports",
    "Number of Microphone ports",
    "Number of VGA ports",
    "Number of USB 3.0 ports",
    "Number of USB 3.1 ports",
    "Memory storage capacity",
    "Model name",
    "Wireless carrier",
    "Color",
    "Connectivity technology",
    "Form factor",
    "Display size",
    "Display type",
    "Display resolution",
    "Other camera features",
    "Device interface - primary",
    "Other display features",
    "Included components",
    "Manufacturer",
    "Item model number",
    "Product dimensions",
    "Item dimensions L x W x H",
    "Batteries",
    "Item weight",
    "ASIN",
    "Customer reviews",
    "Best Sellers Rank",
    "Date First Available",
    "Is Discontinued By Manufacturer",
    "Impedance",
    "Earplacement",
    "Material",
    "Special features",
    "Mounting hardware",
    "Number of pieces",
    "Batteries included",
    "Batteries required",
    "Battery cell composition",
    "Battery Power Rating",
    "Manufacturer recommended age",
    "Language",
    "Mfg Recommended age",
    "Department",
    "Manufacturer Part Number",
    "Item model number",
    "Product Name",
    "Product Dimensions",
    "color",
    "style",
    "Base Type",
    "Voltage",
    "Wattage",
    "Item Package Quantity",
    "Number Of Pieces",
    "CPU speed",
    "Processor Count",
    "Computer Memory Type",
    "Flash Memory Size",
    "Hard Drive Interface",
  ];

  $("table.a-normal.a-spacing-micro tr").each((_, row) => {
    const rowElement = row as Element;
    const label = $(rowElement)
      .find("td.a-span3 span.a-size-base.a-text-bold")
      .text()
      .trim();
    const value = $(rowElement)
      .find("td.a-span9 span.a-size-base.po-break-word")
      .text()
      .trim();
    if (validLabels.includes(label) && value) {
      descriptionParts.push(`${label}: ${value}`);
    }
  });

  // 1. Extract bullet points from the "About this item" section
  const bulletSelector =
    "#feature-bullets ul.a-unordered-list.a-vertical.a-spacing-mini li span.a-list-item";
  $(bulletSelector).each((_, el) => {
    const element = el as Element;
    const text = $(element).text().trim();
    if (text) {
      descriptionParts.push(text);
    }
  });

  // 4. Extract details from the product information section
  const productInfoSelector = "#prodDetails table.prodDetTable tr";
  $(productInfoSelector).each((_, row) => {
    const rowElement = row as Element;
    const label = $(rowElement).find("th.prodDetSectionEntry").text().trim();
    const value = $(rowElement).find("td.prodDetAttrValue").text().trim();
    if (label && value) {
      descriptionParts.push(`${label}: ${value}`);
    }
  });

  // 5. Extract Technical Specifications
  const techSpecSelector = ".aplus-tech-spec-table tbody tr";
  $(techSpecSelector).each((_, row) => {
    const label = $(row).find("td.a-text-bold span").text().trim();
    const value = $(row).find("td:nth-child(2) span").text().trim();
    if (label && value) {
      descriptionParts.push(`${label}: ${value}`);
    }
  });

  // 6. Extract Technical Details section
  const technicalDetailsSelector =
    "#prodDetails #technical-details table tbody tr";
  $(technicalDetailsSelector).each((_, row) => {
    const label = $(row).find("th").text().trim();
    const value = $(row).find("td").text().trim();
    if (label && value) {
      descriptionParts.push(`${label}: ${value}`);
    }
  });

  // 7. Extract Product Details (like dimensions, weight, manufacturer, etc.)
  const productDetailsSelector =
    "#detailBullets_feature_div #detailBullets_feature_div ul.a-unordered-list.a-nostyle.a-vertical.a-spacing-none li span.a-list-item";
  $(productDetailsSelector).each((_, el) => {
    const text = $(el)
      .text()
      .replace(/\n|\s{2,}/g, " ")
      .trim();
    if (text) {
      descriptionParts.push(text);
    }
  });

  // 8. Join all parts with a newline separator
  return descriptionParts.join("\n");
}

export function getHighestPrice(priceList: PriceHistoryItem[]) {
  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice.price;
}

export function getLowestPrice(priceList: PriceHistoryItem[]) {
  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice.price;
}

export function getAveragePrice(priceList: PriceHistoryItem[]) {
  const sumOfPrices = priceList.reduce((acc, curr) => acc + curr.price, 0);
  const averagePrice = sumOfPrices / priceList.length || 0;

  return averagePrice;
}

export const getEmailNotifType = (
  scrapedProduct: Product,
  currentProduct: Product
) => {
  const lowestPrice = getLowestPrice(currentProduct.priceHistory);

  if (scrapedProduct.currentPrice < lowestPrice) {
    return Notification.LOWEST_PRICE as keyof typeof Notification;
  }
  if (!scrapedProduct.isOutOfStock && currentProduct.isOutOfStock) {
    return Notification.CHANGE_OF_STOCK as keyof typeof Notification;
  }
  if (scrapedProduct.discountRate >= THRESHOLD_PERCENTAGE) {
    return Notification.THRESHOLD_MET as keyof typeof Notification;
  }

  return null;
};

export const formatNumber = (num: number = 0) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
