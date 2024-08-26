declare const describe: any;
declare const it: any;
declare const expect: any;

import { duration } from "../src/duration";
import { period } from "../src/period";
import { time } from "../src/time";
import { daily, window } from "../src/window";
import { Index } from "../src/index";

import Util from "../src/util";

describe("Window", () => {
    it("can construct a window", () => {
        const window1 = window(duration("15m"), period(duration("5m")));

        expect(+window1.duration()).toBe(900000);
        expect(+window1.period().frequency()).toBe(300000);
        expect(+window1.period().offset()).toBe(0);

        const window2 = window(duration("15m"))
            .every(duration("5m"))
            .offsetBy(time("2017-07-21T09:33:00.000Z"));

        expect(+window2.duration()).toBe(900000);
        expect(+window2.period().frequency()).toBe(300000);
        expect(+window2.period().offset()).toBe(1500629580000);
    });

    it("can find all the buckets that apply for a given time", () => {
        const slidingWindow = window(duration("15m"), period(duration("5m")));
        const indexSet = slidingWindow.getIndexSet(time("2017-07-21T09:38:00.000Z")).toList();
    });

    it("can represent itself as different types of string", () => {
        expect(window(duration("30m")).toString()).toBe("30m");
        expect(window(duration("30m"), period(duration("10s"))).toString()).toBe("30m@10s");
        expect(window(duration("30m"), period(duration("30m"))).toString()).toBe("30m");
        expect(
            window(
                duration("30m"),
                period(duration("10s"), time("2015-04-22T02:28:00Z"))
            ).toString()
        ).toBe("30m@10s+1429669680000");
        expect(
            window(
                duration("30m"),
                period(duration("30m"), time("2015-04-22T02:28:00Z"))
            ).toString()
        ).toBe("30m+1429669680000");
    });

    it("can find the index string for a window given a time", () => {
        const t1 = time(new Date(2017, 11, 19, 12, 0, 0));
        const hourly = window(duration("1h"));
    });

    it("can use a day window", () => {
        const dayWindowNewYork = daily("America/New_York");
        // const dayWindowPacificTime = daily("America/Los_Angeles");
        const indexes = dayWindowNewYork.getIndexSet(Util.untilNow(duration("5d")));
        // console.log(indexes);
        // indexes.forEach(i => console.log(i.asTimerange()));
    });

    it("can create a day index for a date", () => {
        const t = time(1429673400000);
        const expected = "2015-04-21";
        const window1 = daily("America/Los_Angeles");
        const window2 = daily("Etc/UTC");
        const window3 = daily();
        expect((window1.getIndexSet(t).first() as Index).asString()).toBe("2015-04-21");
        expect((window2.getIndexSet(t).first() as Index).asString()).toBe("2015-04-22");
        expect((window3.getIndexSet(t).first() as Index).asString()).toBe("2015-04-22");
    });

    /*
    it("can create a month index for a date", () => {
        const date = new Date(1429673400000);
        const expected = "2015-04";
        expect(Index.getMonthlyIndexString(date)).toBe(expected);
        done();
    });

    it("can create a year index for a date", () => {
        const date = new Date(1429673400000);
        const expected = "2015";
        expect(Index.getYearlyIndexString(date)).toBe(expected);
        done();
    });
    */
});
