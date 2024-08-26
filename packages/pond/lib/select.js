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
exports.Select = void 0;
const Immutable = require("immutable");
const processor_1 = require("./processor");
/**
 * A `Processor` which takes a `fieldSpec` and returns a new `Event`
 * with only those selected columns.
 */
class Select extends processor_1.Processor {
    constructor(options) {
        super();
        this.options = options;
    }
    addEvent(event) {
        return Immutable.List([event.select(this.options.fields)]);
    }
}
exports.Select = Select;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlbGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILHVDQUF1QztBQUt2QywyQ0FBd0M7QUFJeEM7OztHQUdHO0FBQ0gsTUFBYSxNQUFzQixTQUFRLHFCQUFlO0lBQ3RELFlBQW9CLE9BQXNCO1FBQ3RDLEtBQUssRUFBRSxDQUFDO1FBRFEsWUFBTyxHQUFQLE9BQU8sQ0FBZTtJQUUxQyxDQUFDO0lBQ0QsUUFBUSxDQUFDLEtBQWU7UUFDcEIsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0NBQ0o7QUFQRCx3QkFPQyJ9