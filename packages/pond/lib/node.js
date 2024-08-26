"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationNode = exports.WindowOutputNode = exports.ReduceNode = exports.RateNode = exports.CollapseNode = exports.SelectNode = exports.AlignNode = exports.FillNode = exports.FilterNode = exports.FlatMapNode = exports.MapNode = exports.KeyedCollectionOutputNode = exports.EventOutputNode = exports.KeyedCollectionInputNode = exports.EventInputNode = exports.Node = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const event_1 = require("./event");
const index_1 = require("./index");
const align_1 = require("./align");
const collapse_1 = require("./collapse");
const fill_1 = require("./fill");
const rate_1 = require("./rate");
const reduce_1 = require("./reduce");
const select_1 = require("./select");
const windowedcollection_1 = require("./windowedcollection");
/**
 * @private
 *
 * A Node is a transformation between type S and type T. Both S
 * and T much extend Base.
 *
 * The transformation happens when a `Node` has its `set()` method called
 * by another `Node`. The `input` to set() is of type `S`. When this happens
 * a subclass specific implementation of `process` is called to actually
 * transform the input (of type `S` to an output of type `T`). Of course
 * `S` and `T` maybe the same if the input and output types are expected
 * to be the same. The result of `process`, of type `T`, is returned and
 * the passed onto other downstream Nodes, by calling their `set()` methods.
 */
// tslint:disable-next-line:max-classes-per-file
class Node {
    constructor() {
        this.observers = Immutable.List();
    }
    addObserver(node) {
        this.observers = this.observers.push(node);
    }
    set(input) {
        const outputs = this.process(input);
        if (outputs) {
            outputs.forEach((output) => this.notify(output));
        }
    }
    notify(output) {
        if (this.observers.size > 0) {
            this.observers.forEach((node) => {
                node.set(output);
            });
        }
    }
}
exports.Node = Node;
//
// Nodes
//
/**
 * @private
 *
 * A node which will be at the top of the chain input node. It will accept `Event`s
 * and pass them down the processing chain.
 */
// tslint:disable-next-line:max-classes-per-file
class EventInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
exports.EventInputNode = EventInputNode;
/**
 * @private
 *
 * A node which will be a top of the chain input node. It will accept `KeyedCollection`s
 * and pass them down the processing chain.
 */
// tslint:disable-next-line:max-classes-per-file
class KeyedCollectionInputNode extends Node {
    constructor() {
        super();
        // pass
    }
    process(e) {
        return Immutable.List([e]);
    }
}
exports.KeyedCollectionInputNode = KeyedCollectionInputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class EventOutputNode extends Node {
    constructor(callback) {
        super();
        this.callback = callback;
    }
    process(e) {
        this.callback(e);
        return Immutable.List();
    }
}
exports.EventOutputNode = EventOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class KeyedCollectionOutputNode extends Node {
    constructor(callback) {
        super();
        this.callback = callback;
    }
    process(keyedCollection) {
        const [key, collection] = keyedCollection;
        this.callback(collection, key);
        return Immutable.List();
    }
}
exports.KeyedCollectionOutputNode = KeyedCollectionOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class MapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return Immutable.List([this.mapper(e)]);
    }
}
exports.MapNode = MapNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FlatMapNode extends Node {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    process(e) {
        return this.mapper(e);
    }
}
exports.FlatMapNode = FlatMapNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FilterNode extends Node {
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    process(e) {
        return this.predicate(e) ? Immutable.List([e]) : Immutable.List([]);
    }
}
exports.FilterNode = FilterNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class FillNode extends Node {
    constructor(options) {
        super();
        this.processor = new fill_1.Fill(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.FillNode = FillNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class AlignNode extends Node {
    constructor(options) {
        super();
        this.processor = new align_1.Align(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.AlignNode = AlignNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class SelectNode extends Node {
    constructor(options) {
        super();
        this.processor = new select_1.Select(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.SelectNode = SelectNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class CollapseNode extends Node {
    constructor(options) {
        super();
        this.processor = new collapse_1.Collapse(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.CollapseNode = CollapseNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class RateNode extends Node {
    constructor(options) {
        super();
        this.processor = new rate_1.Rate(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.RateNode = RateNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class ReduceNode extends Node {
    constructor(options) {
        super();
        this.processor = new reduce_1.Reducer(options);
    }
    process(e) {
        return this.processor.addEvent(e);
    }
}
exports.ReduceNode = ReduceNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class WindowOutputNode extends Node {
    constructor(options) {
        super();
        this.processor = new windowedcollection_1.WindowedCollection(options);
    }
    process(e) {
        const keyedCollections = this.processor.addEvent(e);
        return keyedCollections;
    }
}
exports.WindowOutputNode = WindowOutputNode;
/**
 * @private
 *
 */
// tslint:disable-next-line:max-classes-per-file
class AggregationNode extends Node {
    constructor(aggregationSpec) {
        super();
        this.aggregationSpec = aggregationSpec;
    }
    process(keyedCollection) {
        const [group, collection] = keyedCollection;
        const d = {};
        const [groupKey, windowKey] = group.split("::").length === 2 ? group.split("::") : [null, group];
        _.forEach(this.aggregationSpec, (src, dest) => {
            const [srcField, reducer] = src;
            d[dest] = collection.aggregate(reducer, srcField);
        });
        const indexedEvent = new event_1.Event((0, index_1.index)(windowKey), Immutable.fromJS(d));
        return Immutable.List([indexedEvent]);
    }
}
exports.AggregationNode = AggregationNode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFHNUIsbUNBQWdDO0FBQ2hDLG1DQUF1QztBQUl2QyxtQ0FBZ0M7QUFDaEMseUNBQXNDO0FBQ3RDLGlDQUE4QjtBQUM5QixpQ0FBOEI7QUFDOUIscUNBQW1DO0FBQ25DLHFDQUFrQztBQUVsQyw2REFBMEQ7QUFpQjFEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxnREFBZ0Q7QUFDaEQsTUFBc0IsSUFBSTtJQUExQjtRQUNjLGNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFpQixDQUFDO0lBc0IxRCxDQUFDO0lBcEJVLFdBQVcsQ0FBQyxJQUFtQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBUTtRQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsSUFBSSxPQUFPLEVBQUU7WUFDVCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDcEQ7SUFDTCxDQUFDO0lBRVMsTUFBTSxDQUFDLE1BQVM7UUFDdEIsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQixDQUFDLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQztDQUdKO0FBdkJELG9CQXVCQztBQUVELEVBQUU7QUFDRixR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