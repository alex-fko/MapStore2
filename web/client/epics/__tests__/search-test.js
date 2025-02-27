
/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import expect from 'expect';

import { head, last } from 'lodash';
import configureMockStore from 'redux-mock-store';
import { createEpicMiddleware, combineEpics } from 'redux-observable';

import {
    textSearch,
    selectSearchItem,
    TEXT_SEARCH_RESULTS_LOADED,
    TEXT_SEARCH_LOADING,
    TEXT_SEARCH_ADD_MARKER,
    TEXT_SEARCH_RESULTS_PURGE,
    TEXT_SEARCH_NESTED_SERVICES_SELECTED,
    TEXT_SEARCH_TEXT_CHANGE,
    TEXT_SEARCH_ERROR,
    SEARCH_LAYER_WITH_FILTER,
    ZOOM_ADD_POINT,
    zoomAndAddPoint,
    searchLayerWithFilter,
    showGFI, scheduleSearchLayerWithFilter
} from '../../actions/search';

import { SHOW_NOTIFICATION } from '../../actions/notifications';
import { FEATURE_INFO_CLICK, SHOW_MAPINFO_MARKER, loadFeatureInfo, UPDATE_CENTER_TO_MARKER } from '../../actions/mapInfo';
import { ZOOM_TO_EXTENT, ZOOM_TO_POINT } from '../../actions/map';
import { UPDATE_ADDITIONAL_LAYER } from '../../actions/additionallayers';
import {
    searchEpic,
    searchItemSelected,
    zoomAndAddPointEpic,
    searchOnStartEpic,
    textSearchShowGFIEpic,
    delayedSearchEpic
} from '../search';
const rootEpic = combineEpics(searchEpic, searchItemSelected, zoomAndAddPointEpic, searchOnStartEpic, textSearchShowGFIEpic);
const epicMiddleware = createEpicMiddleware(rootEpic);
const mockStore = configureMockStore([epicMiddleware]);

const SEARCH_NESTED = 'SEARCH NESTED';
const TEST_NESTED_PLACEHOLDER = 'TEST_NESTED_PLACEHOLDER';
const STATE_NAME = 'STATE_NAME';

import { testEpic, addTimeoutEpic, TEST_TIMEOUT } from './epicTestUtils';
import {addLayer} from "../../actions/layers";

const nestedService = {
    nestedPlaceholder: TEST_NESTED_PLACEHOLDER
};
const TEXT = "Dinagat Islands";
const item = {
    "type": "Feature",
    "bbox": [125, 10, 126, 11],
    "geometry": {
        "type": "Point",
        "coordinates": [125.6, 10.1]
    },
    "properties": {
        "name": TEXT
    },
    "__SERVICE__": {
        searchTextTemplate: "${properties.name}",
        displayName: "${properties.name}",
        type: "wfs",
        options: {
            staticFilter: "${properties.name}"
        },
        nestedPlaceholder: SEARCH_NESTED,
        nestedPlaceholderMsgId: TEST_NESTED_PLACEHOLDER,
        then: [nestedService]
    }
};

describe('search Epics', () => {
    let store;
    beforeEach(() => {
        store = mockStore();
    });

    afterEach(() => {
        epicMiddleware.replaceEpic(rootEpic);
    });

    it('produces the search epic', (done) => {
        let action = {
            ...textSearch("TEST"),
            services: [{
                type: 'wfs',
                options: {
                    url: 'base/web/client/test-resources/wfs/Wyoming.json',
                    typeName: 'topp:states',
                    queriableAttributes: [STATE_NAME],
                    returnFullData: false
                }
            }]
        };

        store.dispatch( action );
        store.subscribe(() => {
            const actions = store.getActions();
            if (actions.length === 4) {
                expect(actions[1].type).toBe(TEXT_SEARCH_LOADING);
                expect(actions[2].type).toBe(TEXT_SEARCH_RESULTS_LOADED);
                expect(actions[3].type).toBe(TEXT_SEARCH_LOADING);
                done();
            }
        });
    });

    it('produces the selectSearchItem epic', () => {
        let action = selectSearchItem({
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
            },
            "properties": {
                "name": "Dinagat Islands"
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        store.dispatch( action );

        let actions = store.getActions();
        expect(actions.length).toBe(4);
        expect(actions[1].type).toBe(TEXT_SEARCH_RESULTS_PURGE);
        expect(actions[2].type).toBe(ZOOM_TO_EXTENT);
        expect(actions[3].type).toBe(TEXT_SEARCH_ADD_MARKER);
    });

    it('produces the selectSearchItem epic with maxZoomLevel', () => {
        let action = selectSearchItem({
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
            },
            "properties": {
                "name": "Dinagat Islands"
            },
            "__SERVICE__": {
                options: {
                    typeName: "gs:layername",
                    maxZoomLevel: 20
                }
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        store.dispatch( action );

        let actions = store.getActions();
        expect(actions.length).toBe(4);
        expect(actions[1].type).toBe(TEXT_SEARCH_RESULTS_PURGE);
        expect(actions[2].type).toBe(ZOOM_TO_EXTENT);
        expect(actions[2].maxZoom).toBe(20);
        expect(actions[3].type).toBe(TEXT_SEARCH_ADD_MARKER);
    });

    it('produces the selectSearchItem epic and GFI for all layers', () => {
        let action = selectSearchItem({
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
            },
            "properties": {
                "name": "Dinagat Islands"
            },
            "__SERVICE__": {
                launchInfoPanel: "all_layers",
                options: {
                    typeName: "gs:layername"
                }
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        store.dispatch( action );

        let actions = store.getActions();
        expect(actions.length).toBe(6);
        expect(actions[1].type).toBe(TEXT_SEARCH_RESULTS_PURGE);
        expect(actions[2].type).toBe(FEATURE_INFO_CLICK);
        expect(actions[2].filterNameList).toEqual([]);
        expect(actions[3].type).toBe(SHOW_MAPINFO_MARKER);
        expect(actions[4].type).toBe(ZOOM_TO_EXTENT);
        expect(actions[5].type).toBe(TEXT_SEARCH_ADD_MARKER);
    });


    it('produces the selectSearchItem epic and GFI for single layer', (done) => {
        let action = selectSearchItem({
            "id": "Feature_1",
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "LineString",
                "coordinates": [[100, 10], [100, 20]]
            },
            "properties": {
                "name": "Dinagat Islands"
            },
            "__SERVICE__": {
                launchInfoPanel: "single_layer",
                options: {
                    typeName: "gs:layername"
                }
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        const NUM_ACTIONS = 6;
        testEpic(addTimeoutEpic(searchItemSelected, 0), NUM_ACTIONS, action, (actions) => {
            expect(actions[0].type).toBe(TEXT_SEARCH_RESULTS_PURGE);
            expect(actions[1].type).toBe(FEATURE_INFO_CLICK);
            expect(actions[1].itemId).toEqual("Feature_1");
            expect(actions[1].filterNameList).toEqual(["gs:layername"]);
            expect(actions[1].overrideParams).toEqual({"gs:layername": {info_format: "text/html", featureid: "Feature_1", CQL_FILTER: undefined}}); // forces CQL FILTER to undefined (server do not support featureid + CQL_FILTER)
            expect(actions[2].type).toBe(SHOW_MAPINFO_MARKER);
            expect(actions[3].type).toBe(ZOOM_TO_EXTENT);
            expect(actions[4].type).toBe(TEXT_SEARCH_ADD_MARKER);
            expect(actions[5].type).toBe(TEST_TIMEOUT);
            done();
        }, {layers: {flat: [{name: "gs:layername", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, featureInfo: {format: "HTML"}, queryable: true, type: "wms"}]}});
    });

    it('searchItemSelected epic with nested services', () => {
        let action = selectSearchItem(item, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        store.dispatch( action );

        let actions = store.getActions();
        expect(actions.length).toBe(6);
        let expectedActions = [ZOOM_TO_EXTENT, TEXT_SEARCH_ADD_MARKER, TEXT_SEARCH_RESULTS_PURGE, TEXT_SEARCH_NESTED_SERVICES_SELECTED, TEXT_SEARCH_TEXT_CHANGE ];
        let actionsType = actions.map(a => a.type);

        expectedActions.forEach((a) => {
            expect(actionsType.indexOf(a)).toNotBe(-1);
        });

        let zoomToExtentAction = actions.find(m => m.type === ZOOM_TO_EXTENT);
        expect(zoomToExtentAction.maxZoom).toExist();
        expect(zoomToExtentAction.maxZoom).toBe(21);
        expect(zoomToExtentAction.extent.length).toEqual(4);

        let testSearchNestedServicesSelectedAction = actions.filter(m => m.type === TEXT_SEARCH_NESTED_SERVICES_SELECTED)[0];
        expect(testSearchNestedServicesSelectedAction.services[0]).toEqual({
            ...nestedService,
            options: {
                item
            }
        });
        expect(testSearchNestedServicesSelectedAction.items).toEqual({
            placeholder: SEARCH_NESTED,
            placeholderMsgId: TEST_NESTED_PLACEHOLDER,
            text: TEXT
        });
        expect(actions.filter(m => m.type === TEXT_SEARCH_TEXT_CHANGE)[0].searchText).toBe(TEXT);

        // Zoom level from service
        action = selectSearchItem({
            ...item,
            "__SERVICE__": {
                ...item.__SERVICE__, options:
                    {
                        ...item.__SERVICE__.options,
                        maxZoomLevel: 15
                    }
            }}, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });
        store.dispatch( action );

        actions = store.getActions();
        zoomToExtentAction = actions.filter(m => m.type === ZOOM_TO_EXTENT)[1];
        expect(zoomToExtentAction.maxZoom).toExist();
        expect(zoomToExtentAction.maxZoom).toBe(15);
        expect(zoomToExtentAction.extent.length).toEqual(4);
    });

    it('searchItemSelected epic with a service with openFeatureInfoButtonEnabled=false', (done) => {
        let action = selectSearchItem({
            "id": "Feature_1",
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "LineString",
                "coordinates": [[100, 10], [100, 20]]
            },
            "properties": {
                "name": "Dinagat Islands"
            },
            "__SERVICE__": {
                launchInfoPanel: "single_layer",
                openFeatureInfoButtonEnabled: false,
                options: {
                    typeName: "gs:layername"
                }
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });
        const NUM_ACTIONS = 6;
        testEpic(addTimeoutEpic(searchItemSelected, 100), NUM_ACTIONS, action, (actions) => {
            let expectedActions = [ZOOM_TO_EXTENT, TEXT_SEARCH_ADD_MARKER, SHOW_MAPINFO_MARKER, FEATURE_INFO_CLICK, TEST_TIMEOUT];
            let actionsType = actions.map(a => a.type);

            expectedActions.forEach((a) => {
                expect(actionsType.indexOf(a)).toNotBe(-1);
            });
            done();
        }, {layers: {flat: [{name: "gs:layername", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, featureInfo: {format: "HTML"}, queryable: true, type: "wms"}]}});
    });

    it('searchItemSelected epic with a service with openFeatureInfoButtonEnabled=true', (done) => {
        let action = selectSearchItem({
            "id": "Feature_1",
            "type": "Feature",
            "bbox": [125, 10, 126, 11],
            "geometry": {
                "type": "LineString",
                "coordinates": [[100, 10], [100, 20]]
            },
            "properties": {
                "name": "Dinagat Islands"
            },
            "__SERVICE__": {
                launchInfoPanel: "single_layer",
                openFeatureInfoButtonEnabled: true,
                options: {
                    typeName: "gs:layername"
                }
            }
        }, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });
        const NUM_ACTIONS = 4;
        testEpic(addTimeoutEpic(searchItemSelected, 100), NUM_ACTIONS, action, (actions) => {
            let expectedActions = [ZOOM_TO_EXTENT, TEXT_SEARCH_ADD_MARKER, SHOW_MAPINFO_MARKER];
            let actionsType = actions.map(a => a.type);

            expectedActions.forEach((a) => {
                expect(actionsType.indexOf(a)).toNotBe(-1);
            });

            let featureInfoClickAction = actions.filter(m => m.type === FEATURE_INFO_CLICK);
            expect(featureInfoClickAction).toExist();
            expect(featureInfoClickAction.length).toBe(0);
            done();
        }, {layers: {flat: [{name: "gs:layername", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, featureInfo: {format: "HTML"}, queryable: true, type: "wms"}]}});
    });

    it('zoomAndAddPointEpic ADD addiditonalLayer and zoom to point', () => {
        let action = zoomAndAddPoint({x: 1, y: 0}, 10, "EPSG:4326");
        store.dispatch( action );
        let actions = store.getActions();
        expect(actions.length).toBe(3);
        let expectedActions = [ZOOM_ADD_POINT, UPDATE_ADDITIONAL_LAYER, ZOOM_TO_POINT ];
        let actionsType = actions.map(a => a.type);
        expectedActions.forEach((a) => {
            expect(actionsType.indexOf(a)).toNotBe(-1);
        });
    });

    it('geometry service', (done) => {
        // use the done function for asynchronus calls
        const itemWithoutGeom = {
            "type": "Feature",
            "properties": {
                "name": TEXT
            },
            "__SERVICE__": {
                searchTextTemplate: "${properties.name}",
                displayName: "${properties.name}",
                type: "wfs",
                options: {
                    staticFilter: "${properties.name}"
                },
                "geomService": {
                    type: 'wfs',
                    options: {
                        url: 'base/web/client/test-resources/wfs/Wyoming.json',
                        typeName: 'topp:states',
                        queriableAttributes: [STATE_NAME],
                        returnFullData: false
                    }
                }
            }
        };

        // needed for the changeMapView action
        let action = selectSearchItem(itemWithoutGeom, {
            size: {
                width: 200,
                height: 200
            },
            projection: "EPSG:4326"
        });

        store.dispatch( action );

        store.subscribe(() => {
            const actions = store.getActions();
            if (actions.length === 5) {
                const addMarkerAction = actions.filter(m => m.type === TEXT_SEARCH_ADD_MARKER)[0];

                expect(addMarkerAction).toExist();
                expect(addMarkerAction.markerPosition.geometry).toExist();

                done();
            }
        });
    });
    it('respond with correct service error when service type missing', (done) => {
        let action = {
            ...textSearch("TEST"),
            services: [{
                type: 'nom',
                options: {
                    url: 'base/web/client/test-resources/wfs/Wyoming.json',
                    typeName: 'topp:states',
                    queriableAttributes: [STATE_NAME],
                    returnFullData: false
                }
            }]
        };
        testEpic(searchEpic, 3, action, (actions) => {
            expect(actions).toExist();
            expect(actions[0].type).toBe(TEXT_SEARCH_LOADING);
            expect(actions.length).toBe(3);
            expect(actions[1].type).toBe(TEXT_SEARCH_ERROR);
            expect(actions[1].error).toExist();
            expect(actions[1].error.serviceType).toBe('nom');
            expect(actions[2].type).toBe(TEXT_SEARCH_LOADING);
            done();

        });
    });
    it('check the search result resorting is conservative and the number of results limited to maxResults', (done) => {
        const maxResults = 5;
        let action = {
            ...textSearch("TEST"),
            services: [{
                type: 'wfs',
                options: {
                    url: 'base/web/client/test-resources/wfs/Wyoming_18_results.json',
                    typeName: 'topp:states',
                    queriableAttributes: [STATE_NAME],
                    returnFullData: false
                }
            }],
            maxResults
        };

        const NUMBER_OF_ACTIONS = 4;
        testEpic(
            addTimeoutEpic(searchEpic, 100),
            NUMBER_OF_ACTIONS,
            [action],
            actions => {
                expect(actions.length).toBe(NUMBER_OF_ACTIONS);
                expect(actions[1].type).toBe(TEXT_SEARCH_LOADING);
                expect(actions[2].type).toBe(TEXT_SEARCH_RESULTS_LOADED);
                expect(actions[2].results.length).toBe(maxResults);
                expect(head(actions[2].results).id).toBe("states.1");
                expect(last(actions[2].results).id).toBe("states.5");
                expect(actions[3].type).toBe(TEXT_SEARCH_LOADING);
                done();
            }, {});
    });
    it('produces the search epic with two services with more results than default limit', (done) => {
        const maxResults = 5;
        let action = {
            ...textSearch("TEST"),
            services: [{
                type: 'wfs',
                options: {
                    url: 'base/web/client/test-resources/wfs/Wyoming_18_results.json',
                    typeName: 'topp:states',
                    queriableAttributes: [STATE_NAME],
                    returnFullData: false
                }
            },
            {
                type: 'wfs',
                options: {
                    url: 'base/web/client/test-resources/wfs/Arizona_18_results.json',
                    typeName: 'topp:states',
                    queriableAttributes: [STATE_NAME],
                    returnFullData: false
                }
            }],
            maxResults
        };

        const NUMBER_OF_ACTIONS = 5;
        testEpic(
            addTimeoutEpic(searchEpic, 100),
            NUMBER_OF_ACTIONS,
            [action],
            actions => {
                expect(actions.length).toBe(NUMBER_OF_ACTIONS);
                expect(actions[1].type).toBe(TEXT_SEARCH_LOADING);
                expect(actions[2].type).toBe(TEXT_SEARCH_RESULTS_LOADED);
                expect(actions[2].results.length).toBe(maxResults);
                expect(head(actions[2].results).id).toBe("states.1");
                expect(last(actions[2].results).id).toBe("states.5");
                expect(actions[3].type).toBe(TEXT_SEARCH_RESULTS_LOADED);
                expect(actions[3].results.length).toBe(maxResults);
                expect(head(actions[3].results).id).toBe("states.1");
                expect(last(actions[3].results).id).toBe("states.5");
                expect(actions[4].type).toBe(TEXT_SEARCH_LOADING);
                done();
            }, {});
    });
    it('searchOnStartEpic, return error for non queriable layers, with empty state', (done) => {
        let action = searchLayerWithFilter({layer: "layerName", cql_filter: "cql"});
        const NUM_ACTIONS = 1;
        testEpic(searchOnStartEpic, NUM_ACTIONS, action, (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(SHOW_NOTIFICATION);
            expect(actions[0].message).toBe("search.errors.nonQueriableLayers");
            done();
        });
    });
    it('searchOnStartEpic, return error for non queryable layers, with non queryable layer', (done) => {
        let action = searchLayerWithFilter({layer: "layerName", cql_filter: "cql"});
        const NUM_ACTIONS = 1;
        testEpic(searchOnStartEpic, NUM_ACTIONS, action, (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(SHOW_NOTIFICATION);
            expect(actions[0].message).toBe("search.errors.nonQueriableLayers");
            done();
        }, {layers: {flat: [{name: "layerName", url: "clearlyNotAUrl", visibility: true, queryable: false, type: "wms"}]}});
    });
    it('searchOnStartEpic, return error for wrong url in layer', (done) => {
        let action = searchLayerWithFilter({layer: "layerName", cql_filter: "cql"});
        const NUM_ACTIONS = 1;
        testEpic(searchOnStartEpic, NUM_ACTIONS, action, (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(SHOW_NOTIFICATION);
            expect(actions[0].message).toBe("search.errors.serverError");
            done();
        }, {layers: {flat: [{name: "layerName", url: "clearlyNotAUrl", visibility: true, queryable: true, type: "wms"}]}});
    });
    it('searchOnStartEpic, that sends a Getfeature and a GFI requests', (done) => {
        let action = searchLayerWithFilter({layer: "layerName", cql_filter: "cql"});
        const NUM_ACTIONS = 2;
        testEpic(searchOnStartEpic, NUM_ACTIONS, action, (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(FEATURE_INFO_CLICK);
            expect(actions[1].type).toBe(SHOW_MAPINFO_MARKER);
            done();
        }, {layers: {flat: [{name: "layerName", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, queryable: true, type: "wms"}]}});
    });
    it('textSearchShowGFIEpic, it sends info format taken from layer', (done) => {
        let action = showGFI(
            {
                layer: "layerName",
                type: "Feature",
                bbox: [125, 10, 126, 11],
                geometry: {
                    type: "Point",
                    coordinates: [125.6, 10.1]
                },
                id: "layer_01",
                "__SERVICE__": {
                    launchInfoPanel: "single_layer",
                    openFeatureInfoButtonEnabled: true,
                    options: {
                        typeName: "layerName",
                        maxZoomLevel: 20
                    }
                }
            });
        const NUM_ACTIONS = 4;
        testEpic(textSearchShowGFIEpic, NUM_ACTIONS, [action, loadFeatureInfo()], (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(FEATURE_INFO_CLICK);
            expect(actions[0].overrideParams.layerName.info_format).toBe("text/html");
            expect(actions[0].overrideParams.layerName.featureid).toBe("layer_01");
            expect(actions[1].type).toBe(SHOW_MAPINFO_MARKER);
            expect(actions[2].type).toBe(TEXT_SEARCH_ADD_MARKER);
            expect(actions[3].type).toBe(ZOOM_TO_EXTENT);
            done();
        }, {layers: {flat: [{name: "layerName", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, featureInfo: {format: "HTML"}, queryable: true, type: "wms"}]}});
    });
    it('textSearchShowGFIEpic, temporary disable center to marker', (done) => {
        let action = showGFI(
            {
                layer: "layerName",
                type: "Feature",
                bbox: [125, 10, 126, 11],
                geometry: {
                    type: "Point",
                    coordinates: [125.6, 10.1]
                },
                id: "layer_01",
                "__SERVICE__": {
                    launchInfoPanel: "single_layer",
                    openFeatureInfoButtonEnabled: true,
                    options: {
                        typeName: "layerName",
                        maxZoomLevel: 20
                    }
                }
            });
        const NUM_ACTIONS = 6;
        testEpic(textSearchShowGFIEpic, NUM_ACTIONS, [action, loadFeatureInfo()], (actions) => {
            expect(actions).toExist();
            expect(actions.length).toBe(NUM_ACTIONS);
            expect(actions[0].type).toBe(UPDATE_CENTER_TO_MARKER);
            expect(actions[0].status).toBe(false);
            expect(actions[1].type).toBe(FEATURE_INFO_CLICK);
            expect(actions[1].overrideParams.layerName.info_format).toBe("text/html");
            expect(actions[1].overrideParams.layerName.featureid).toBe("layer_01");
            expect(actions[2].type).toBe(SHOW_MAPINFO_MARKER);
            expect(actions[3].type).toBe(TEXT_SEARCH_ADD_MARKER);
            expect(actions[4].type).toBe(ZOOM_TO_EXTENT);
            expect(actions[5].type).toBe(UPDATE_CENTER_TO_MARKER);
            expect(actions[5].status).toBe(true);
            done();
        }, { mapInfo: {centerToMarker: true}, layers: {flat: [{name: "layerName", url: "base/web/client/test-resources/wms/GetFeature.json", visibility: true, featureInfo: {format: "HTML"}, queryable: true, type: "wms"}]}});
    });

    it('delayedSearchEpic', (done) => {
        const NUM_ACTIONS = 1;
        testEpic(delayedSearchEpic, NUM_ACTIONS,
            [
                scheduleSearchLayerWithFilter({ layer: 'layer1', cql_filter: "MM='nn'"}),
                addLayer({ name: 'layer1'})
            ],
            (actions) => {
                expect(actions).toExist();
                expect(actions.length).toBe(NUM_ACTIONS);
                expect(actions[0].type).toBe(SEARCH_LAYER_WITH_FILTER);
                expect(actions[0].layer).toBe('layer1');
                expect(actions[0].cql_filter).toBe("MM='nn'");
                done();
            }, {});
    });

    it('delayedSearchEpic - do not dispatch action once layer was added', (done) => {
        const NUM_ACTIONS = 2;
        testEpic(addTimeoutEpic(delayedSearchEpic, 100), NUM_ACTIONS,
            [
                scheduleSearchLayerWithFilter({ layer: 'layer1', cql_filter: "MM='nn'"}),
                addLayer({ name: 'layer1'}),
                addLayer({ name: 'layer1'})
            ],
            (actions) => {
                expect(actions).toExist();
                expect(actions.length).toBe(NUM_ACTIONS);
                expect(actions[0].type).toBe(SEARCH_LAYER_WITH_FILTER);
                expect(actions[0].layer).toBe('layer1');
                expect(actions[0].cql_filter).toBe("MM='nn'");
                expect(actions[1].type).toBe(TEST_TIMEOUT);
                done();
            }, {});
    });

    it('delayedSearchEpic - dispatch action if another layer was added prior to the expected', (done) => {
        const NUM_ACTIONS = 2;
        testEpic(addTimeoutEpic(delayedSearchEpic, 100), NUM_ACTIONS,
            [
                scheduleSearchLayerWithFilter({ layer: 'layer1', cql_filter: "MM='nn'"}),
                addLayer({ name: 'layer2'}),
                addLayer({ name: 'layer1'})
            ],
            (actions) => {
                expect(actions).toExist();
                expect(actions.length).toBe(NUM_ACTIONS);
                expect(actions[0].type).toBe(SEARCH_LAYER_WITH_FILTER);
                expect(actions[0].layer).toBe('layer1');
                expect(actions[0].cql_filter).toBe("MM='nn'");
                expect(actions[1].type).toBe(TEST_TIMEOUT);
                done();
            }, {});
    });
});
