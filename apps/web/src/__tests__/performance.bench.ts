/**
 * Performance Benchmarks for Web App
 *
 * Run with: npx vitest bench
 */
import { bench, describe } from "vitest";

describe("Data Processing Performance", () => {
  // Sample data for benchmarks
  const generateDailyData = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      year: 2026,
      month: 1,
      day: i + 1,
      xe_ha: Math.floor(Math.random() * 100),
      xe_giao: Math.floor(Math.random() * 100),
      xe_cfs: Math.floor(Math.random() * 50),
      xe_total: 0,
      xalan_ha: Math.floor(Math.random() * 50),
      xalan_giao: Math.floor(Math.random() * 50),
      xalan_cfs: Math.floor(Math.random() * 25),
      xalan_total: 0,
      total_in: 0,
      total_out: 0,
      total_cfs: 0,
      total: 0,
    }));
  };

  bench("process 100 daily records", () => {
    const data = generateDailyData(100);
    data.forEach((d) => {
      d.xe_total = d.xe_ha + d.xe_giao + d.xe_cfs;
      d.xalan_total = d.xalan_ha + d.xalan_giao + d.xalan_cfs;
      d.total_in = d.xe_ha + d.xalan_ha;
      d.total_out = d.xe_giao + d.xalan_giao;
      d.total_cfs = d.xe_cfs + d.xalan_cfs;
      d.total = d.xe_total + d.xalan_total;
    });
  });

  bench("process 1000 daily records", () => {
    const data = generateDailyData(1000);
    data.forEach((d) => {
      d.xe_total = d.xe_ha + d.xe_giao + d.xe_cfs;
      d.xalan_total = d.xalan_ha + d.xalan_giao + d.xalan_cfs;
      d.total_in = d.xe_ha + d.xalan_ha;
      d.total_out = d.xe_giao + d.xalan_giao;
      d.total_cfs = d.xe_cfs + d.xalan_cfs;
      d.total = d.xe_total + d.xalan_total;
    });
  });

  bench("aggregate monthly data from 365 days", () => {
    const data = generateDailyData(365);
    const monthly = new Map<string, number>();

    data.forEach((d) => {
      const key = `${d.year}-${d.month}`;
      monthly.set(key, (monthly.get(key) || 0) + d.total);
    });
  });
});

describe("Array Operations Performance", () => {
  const largeArray = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    date: new Date(2026, 0, (i % 31) + 1),
  }));

  bench("filter large array", () => {
    largeArray.filter((item) => item.value > 500);
  });

  bench("map large array", () => {
    largeArray.map((item) => ({ ...item, doubled: item.value * 2 }));
  });

  bench("reduce large array", () => {
    largeArray.reduce((sum, item) => sum + item.value, 0);
  });

  bench("sort large array by value", () => {
    [...largeArray].sort((a, b) => a.value - b.value);
  });

  bench("sort large array by date", () => {
    [...largeArray].sort((a, b) => a.date.getTime() - b.date.getTime());
  });
});

describe("Date Operations Performance", () => {
  bench("parse 1000 date strings", () => {
    const dates = Array.from(
      { length: 1000 },
      (_, i) =>
        `2026-${String((i % 12) + 1).padStart(2, "0")}-${String(
          (i % 28) + 1
        ).padStart(2, "0")}`
    );
    dates.map((d) => new Date(d));
  });

  bench("format 1000 dates", () => {
    const dates = Array.from(
      { length: 1000 },
      (_, i) => new Date(2026, i % 12, (i % 28) + 1)
    );
    dates.map((d) => d.toISOString().split("T")[0]);
  });

  bench("calculate date ranges", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });
});

describe("String Operations Performance", () => {
  const sampleTexts = Array.from(
    { length: 1000 },
    () => "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  );

  bench("string concatenation", () => {
    let result = "";
    for (const text of sampleTexts) {
      result += text;
    }
    void result; // Use to avoid unused variable warning
  });

  bench("array join", () => {
    sampleTexts.join("");
  });

  bench("template literals", () => {
    sampleTexts.map((text) => `Processed: ${text}`);
  });
});

describe("Object Operations Performance", () => {
  const createObject = () => ({
    id: Math.random(),
    name: "Test Object",
    data: {
      nested: {
        value: 123,
        array: [1, 2, 3, 4, 5],
      },
    },
  });

  bench("shallow copy 1000 objects", () => {
    const obj = createObject();
    Array.from({ length: 1000 }, () => ({ ...obj }));
  });

  bench("deep copy 1000 objects (JSON)", () => {
    const obj = createObject();
    Array.from({ length: 1000 }, () => JSON.parse(JSON.stringify(obj)));
  });

  bench("deep copy 1000 objects (structuredClone)", () => {
    const obj = createObject();
    Array.from({ length: 1000 }, () => structuredClone(obj));
  });
});

describe("Search Performance", () => {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    category: ["A", "B", "C", "D"][i % 4],
  }));

  const itemMap = new Map(items.map((item) => [item.id, item]));

  bench("linear search in array", () => {
    items.find((item) => item.id === "item-9999");
  });

  bench("map lookup", () => {
    itemMap.get("item-9999");
  });

  bench("filter by category", () => {
    items.filter((item) => item.category === "A");
  });

  bench("search by name (includes)", () => {
    items.filter((item) => item.name.toLowerCase().includes("999"));
  });
});
