/*
 * Copyright 2022, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import expect from 'expect';
import React from 'react';
import ReactDOM from 'react-dom';

import DownloadDialog from '../DownloadDialog';

describe('Test for DownloadDialog component', () => {
    beforeEach((done) => {
        document.body.innerHTML = '<div id="container" style="height:500px"></div>';
        setTimeout(done);
    });

    afterEach((done) => {
        ReactDOM.unmountComponentAtNode(document.getElementById("container"));
        document.body.innerHTML = '';
        setTimeout(done);
    });

    it('render download options', () => {
        ReactDOM.render(<DownloadDialog enabled service="wps"/>, document.getElementById("container"));
        const dialog = document.getElementById('mapstore-export');
        expect(dialog).toBeTruthy();
        expect(dialog.getElementsByTagName('form')[0]).toBeTruthy();
    });
});
