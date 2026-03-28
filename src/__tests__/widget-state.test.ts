import { arrayMove } from "@dnd-kit/sortable";

describe("Widget drag-drop state updates", () => {
  const widgets = [
    { id: "mrr-chart", title: "MRR", position: 0 },
    { id: "social-growth", title: "Social", position: 1 },
    { id: "keyword-rankings", title: "Keywords", position: 2 },
    { id: "webhooks", title: "Webhooks", position: 3 },
    { id: "active-users", title: "Users", position: 4 },
    { id: "content-calendar", title: "Calendar", position: 5 },
  ];

  it("moves widget from position 0 to position 2 correctly", () => {
    const result = arrayMove(widgets, 0, 2).map((w, i) => ({ ...w, position: i }));
    expect(result[0].id).toBe("social-growth");
    expect(result[1].id).toBe("keyword-rankings");
    expect(result[2].id).toBe("mrr-chart");
    expect(result.map((w) => w.position)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("does not change order when dragging to same position", () => {
    const result = arrayMove(widgets, 2, 2).map((w, i) => ({ ...w, position: i }));
    expect(result.map((w) => w.id)).toEqual(widgets.map((w) => w.id));
  });

  it("positions are always a contiguous sequence starting at 0", () => {
    for (let from = 0; from < widgets.length; from++) {
      for (let to = 0; to < widgets.length; to++) {
        const result = arrayMove(widgets, from, to).map((w, i) => ({ ...w, position: i }));
        expect(result.map((w) => w.position)).toEqual([0, 1, 2, 3, 4, 5]);
      }
    }
  });
});
