"use strict";
/**
 *  Copyright (c) 2016-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reducer = void 0;
const Immutable = require("immutable");
const processor_1 = require("./processor");
/**
 * A `Processor` to take a rolling set of incoming `Event`s, a
 * Immutable.List<Event>, and reduce them down to a single output `Event`.
 * This enables different types of past dependent functions.
 *
 * To control the rate calculation you need to specify a `ReduceOptions` object
 * in the constuctor, which takes the following form:
 * ```
 * {
 *     count: number;
 *     accumulator: Event
 *     iteratee: ListReducer;
 * }
 * ```
 * Options:
 *  * `count` - The number of `Event`s to include on each call. The last `count`
 *              `Event`s are passed to the `reducer` function.
 *  * `accumulator` - optional initial value
 *  * `iteratee` - a function mapping an `Immutable.List<Event>` to an `Event`
 */
class Reducer extends processor_1.Processor {
    constructor(options) {
        super();
        const { count = 1, iteratee, accumulator } = options;
        this._count = count;
        this._iteratee = iteratee;
        this._previous = Immutable.List();
        this._accumulator = accumulator ? accumulator : null;
    }
    /**
     * Perform the reduce operation on the `Event` and emit.
     */
    addEvent(event) {
        this._previous = this._previous.push(event);
        if (this._previous.size > this._count) {
            this._previous = this._previous.shift();
        }
        this._accumulator = this._iteratee(this._accumulator, this._previous);
        return Immutable.List([this._accumulator]);
    }
}
exports.Reducer = Reducer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JlZHVjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILHVDQUF1QztBQUt2QywyQ0FBd0M7QUFJeEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFhLE9BQXVCLFNBQVEscUJBQWU7SUFPdkQsWUFBWSxPQUF5QjtRQUNqQyxLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDckQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFZLENBQUM7UUFDNUMsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3pELENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVEsQ0FBQyxLQUFlO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ25DLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUMzQztRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0o7QUEzQkQsMEJBMkJDIn0=