define(['dojo/_base/declare', 'dijit/_WidgetsInTemplateMixin', 'jimu/BaseWidget', 'dojo/_base/lang', 'jimu/LayerInfos/LayerInfos', "esri/tasks/query", "esri/tasks/QueryTask", "esri/tasks/StatisticDefinition", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color", "jimu/dijit/Message", 'esri/dijit/util/busyIndicator'], function (declare, _WidgetsInTemplateMixin, BaseWidget, lang, LayerInfos, Query, QueryTask, StatisticDefinition, SimpleFillSymbol, SimpleLineSymbol, Color, Message, BusyIndicator) {
    return declare([BaseWidget, _WidgetsInTemplateMixin, Query, QueryTask, StatisticDefinition], {

        // Custom widget code goes here

        baseClass: 'consulta-wgt',
        iniClause: '1=1',

        layersMap: [],

        field_dep_nm_depa: 'NM_DEPA',
        field_dep_cd_depa: 'CD_DEPA',

        field_prov_nm_prov: 'NM_PROV',
        field_prov_cd_prov: 'CD_PROV',

        field_dist_nm_dist: 'NM_DIST',
        field_dist_cd_dist: 'CD_DIST',

        field_codigou_dm: 'CODIGOU',
        field_concesion_dm: 'CONCESION',
        field_sustancia_dm: 'SUSTANCIA',

        // Campos DC
        field_id: 'ID', // Objectid del minero informal
        field_minero_informal: 'MINERO_INFORMAL', // Nombre del minero informal
        field_m_ruc: 'M_RUC', // RUC del minero informal
        field_derecho_minero: 'DERECHO_MINERO', // Nombre del derecho mineroo
        field_id_unidad: 'ID_UNIDAD', // Identificador del derecho minero (CODIGOU)
        field_tipo_persona: 'TIPO_PERSONA', // Tipo de persona (natural, juridica)
        field_id_ubigeo_inei: 'ID_UBIGEO_INEI', // Ubigeo

        controller_query: '', // Permite identificar la opcion de consulta seleccionada
        controller_layer_query: false,

        controller_ubigeo: '',

        temporal_class_results: '',

        postCreate: function postCreate() {
            self_cw = this;
            this.inherited(arguments);
            // console.log('Consulta_wgt::postCreate');;
            this._getAllLayers();
        },
        _getAllLayers: function _getAllLayers() {
            LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (layerInfosObj) {
                this.layersMap = layerInfosObj;
            }));
        },
        _showMessage: function _showMessage(message) {
            var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'message';

            switch (type) {
                case 'question':
                    var messagebox = new Message({
                        type: type,
                        titleLabel: 'Widget ' + this.nls._widgetLabel + ': ' + type,
                        message: message,
                        buttons: [{
                            label: 'SI',
                            onClick: lang.hitch(this, lang.hitch(this, function () {
                                messagebox.close();
                            }))
                        }, {
                            label: 'NO',
                            onClick: lang.hitch(this, lang.hitch(this, function () {
                                this._cleanMap();
                                messagebox.close();
                            }))
                        }]
                    });

                    break;
                default:
                    new Message({
                        type: type,
                        titleLabel: 'Widget ' + this.nls._widgetLabel + ': ' + type,
                        message: message
                    });
                    break;
            }
        },
        _getDataByTipoPersona: function _getDataByTipoPersona() {
            var id = this.config.layer_id_dc;
            var feature_dc = this.layersMap.getLayerInfoById(id);
            var query = new Query();
            query.where = this.field_tipo_persona + ' IS NOT NULL';
            query.returnGeometry = false;
            query.returnDistinctValues = true;
            query.outFields = [this.field_tipo_persona];

            feature_dc.layerObject.queryFeatures(query, function (results) {
                var features = results.features;
                if (features.length) {
                    features.forEach(function (i) {
                        var opt = document.createElement("option");
                        opt.value = i.attributes[self_cw.field_tipo_persona];
                        opt.text = i.attributes[self_cw.field_tipo_persona];
                        self_cw.select_tipo_persona_cw.add(opt);
                    });
                    var opt = document.createElement("option");
                    opt.value = '';
                    opt.text = 'Todos';
                    opt.selected = true;
                    self_cw.select_tipo_persona_cw.add(opt);
                } else {
                    self_cw._showMessage(self_cw.nls.error_tipo_persona_count);
                }
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_tipo_persona + '\n' + error.message, type = 'error');
            });
        },
        _getDataByDepartamento: function _getDataByDepartamento() {
            var id = this.config.layer_id_dep;
            var feature_dep = this.layersMap.getLayerInfoById(id);
            var queryTask = new QueryTask(feature_dep.getUrl());
            var query = new Query();
            query.where = this.field_dep_cd_depa + ' <> 99';
            query.returnGeometry = false;
            query.outFields = [this.field_dep_nm_depa, this.field_dep_cd_depa];
            query.orderByFields = [this.field_dep_nm_depa];
            queryTask.execute(query, function (results) {
                var features = results.features;
                if (features.length) {
                    results.features.forEach(function (i) {
                        var opt = document.createElement("option");
                        opt.value = i.attributes[self_cw.field_dep_cd_depa];
                        opt.text = i.attributes[self_cw.field_dep_nm_depa];
                        self_cw.departamento_cw.add(opt);
                    });
                    var opt = document.createElement("option");
                    opt.value = '';
                    opt.text = 'Todos';
                    opt.selected = true;
                    self_cw.departamento_cw.add(opt);
                } else {
                    self_cw._showMessage(self_cw.nls.error_departamento_count);
                }
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_departamento + '\n' + error.message, type = 'error');
            });
        },
        _getDataByProvincia: function _getDataByProvincia(evt) {
            // Evento que se ejecuta cuando el usuario selecciona un departamento
            // Carga las provincias pertenecientes al departamento seleccionado
            // Realiza el zoom en el mapa al departamento seleccionado

            // habilitar loader
            this.busyIndicator.show();

            // Obteniendo datos de la opcion seleccionada
            var cd_depa = evt.target.value;

            // Capturando el codigo de la provincia en el controlador de ubigeo
            this.controller_ubigeo = cd_depa;

            this.distrito_cw.innerHTML = '';
            this.container_distrito_cw.classList.remove('active');

            // Si se selecciono la opcion 'Todos' en el elemento 'Select' de departamentos
            if (cd_depa == '') {
                // Removemos el combo de provincias
                this.container_provincia_cw.classList.remove('active');
                // deshabilitar loader
                this.busyIndicator.hide();
                // Salimos del evento
                return;
            }

            // Si el contenedor de provincias no esta activo
            if (!this.container_provincia_cw.classList.contains('active')) {
                // Activar el contenedor de provincias
                this.container_provincia_cw.classList.toggle('active');
            };

            // Obteniendo el LayerObject de provincias
            var id = this.config.layer_id_prov;
            var feature_prov = this.layersMap.getLayerInfoById(id);
            var queryTask = new QueryTask(feature_prov.getUrl());

            // Definiendo el objeto Query para obtener las provincias del departamento
            var query = new Query();
            query.where = this.field_dep_cd_depa + ' = \'' + cd_depa + '\'';
            query.returnGeometry = false;
            query.outFields = [this.field_prov_nm_prov, this.field_prov_cd_prov];
            query.orderByFields = [this.field_prov_nm_prov];

            // Ejecucion de consulta para obtener las opciones de provincias
            queryTask.execute(query, function (results) {
                // Zoom al departamento seleccionado
                self_cw._zoomExtendSelected(self_cw.config.layer_id_dep, query.where);
                var features = results.features;
                // Si se encontraron resultados
                if (features.length) {
                    self_cw.provincia_cw.innerHTML = '';
                    features.forEach(function (i) {
                        var opt = document.createElement("option");
                        opt.value = i.attributes[self_cw.field_prov_cd_prov];
                        opt.text = i.attributes[self_cw.field_prov_nm_prov];
                        self_cw.provincia_cw.add(opt);
                    });
                    var opt = document.createElement("option");
                    opt.value = '';
                    opt.text = 'Todos';
                    opt.selected = true;
                    self_cw.provincia_cw.add(opt);
                } else {
                    // Notificar si no se encontraron elementos
                    self_cw._showMessage('' + self_cw.nls.error_provincia_count);
                };
                // deshabilitar loader
                self_cw.busyIndicator.hide();
            }, function (error) {
                // Notificar si ocurrio algun error al momento de solicitar los datos
                self_cw._showMessage(self_cw.nls.error_provincia + '\n' + error.message, type = 'error');
                self_cw.busyIndicator.hide();
            });
        },
        _getDataByDistrito: function _getDataByDistrito(evt) {
            // Evento que se ejecuta cuando el usuario selecciona una provincia
            // Carga las provincias pertenecientes a la provincia seleccionada
            // Realiza el zoom en el mapa a la provincia seleccionada

            // habilitar loader
            this.busyIndicator.show();

            // Obteniendo datos de la opcion seleccionada
            var cd_prov = evt.target.value;

            // Si se selecciono la opcion 'Todos' en el elemento 'Select' de provincias
            if (cd_prov == '') {
                // Anulamos los dos ultimos digitos del controlador de ubigeo
                this.controller_ubigeo = this.controller_ubigeo.substring(0, 2);
                // Ocultamos el selector de distritos
                this.container_distrito_cw.classList.remove('active');
                // deshabilitar loader
                this.busyIndicator.hide();
                return;
            }

            // Si el contenedor de distrito no esta activo
            if (!this.container_distrito_cw.classList.contains('active')) {
                // Activar el contenedor de distrito
                this.container_distrito_cw.classList.toggle('active');
            }

            // Capturando el codigo de la provincia en el controlador de ubigeo
            this.controller_ubigeo = cd_prov;

            // Obteniendo el LayerObject de distritos
            var id = this.config.layer_id_dist;
            var feature_dist = this.layersMap.getLayerInfoById(id);
            var queryTask = new QueryTask(feature_dist.getUrl());

            // Definiendo el objeto Query para obtener los distritos de la provincia
            var query = new Query();
            query.where = this.field_prov_cd_prov + ' = \'' + cd_prov + '\'';
            query.returnGeometry = false;
            query.outFields = [this.field_dist_nm_dist, this.field_dist_cd_dist];
            query.orderByFields = [this.field_dist_nm_dist];

            // Ejecucion de consulta para obtener las opciones de distritos
            queryTask.execute(query, function (results) {
                // Zoom a la provincia seleccionada
                self_cw._zoomExtendSelected(self_cw.config.layer_id_prov, query.where);
                self_cw.distrito_cw.innerHTML = "";
                var features = results.features;
                // Si se encontraron resultados
                if (features.length) {
                    features.forEach(function (i) {
                        var opt = document.createElement("option");
                        opt.value = i.attributes[self_cw.field_dist_cd_dist];
                        opt.text = i.attributes[self_cw.field_dist_nm_dist];
                        self_cw.distrito_cw.add(opt);
                    });
                    var opt = document.createElement("option");
                    opt.value = '';
                    opt.text = 'Todos';
                    opt.selected = true;
                    self_cw.distrito_cw.add(opt);
                } else {
                    // Notificar si no se encontraron elementos
                    self_cw._showMessage('' + self_cw.nls.error_distrito_count);
                };
                // deshabilitar loader
                self_cw.busyIndicator.hide();
            }, function (error) {
                // Notificar si ocurrio algun error al momento de solicitar los datos
                self_cw._showMessage(self_cw.nls.error_distrito + '\n' + error.message, type = 'error');
                // deshabilitar loader
                self_cw.busyIndicator.hide();
            });
        },
        _getDistritoSelected: function _getDistritoSelected(evt) {
            // Evento que se ejecuta cuando el usuario selecciona una distrito
            // Realiza el zoom en el mapa al distrito seleccionado
            var cd_dist = evt.target.value;
            whereDefinition = this.field_dist_cd_dist + ' = \'' + cd_dist + '\'';
            if (cd_dist == '') {
                this.controller_ubigeo = this.controller_ubigeo.substring(0, 4);
                return;
            }
            this.controller_ubigeo = cd_dist;
            this._zoomExtendSelected(this.config.layer_id_dist, whereDefinition);
        },
        _addEventToLayerQuery: function _addEventToLayerQuery() {
            dojo.query(".capa_consulta_cw").on('click', this._setFormContainer);
        },
        _setFormContainer: function _setFormContainer(evt) {
            var title = evt.currentTarget.innerText;

            self_cw.controller_query = evt.currentTarget.id;
            self_cw.titulo_consulta.innerText = title;
            self_cw.ListaCapasConsulta.hidden = true;

            var nodeContainer_cw = dojo.query(".container_cw");
            dojo.toggleClass(nodeContainer_cw[0], 'active');
            dojo.query('.formulario_cw').forEach(function (node) {
                if (node.dataset.dojoAttachPoint.includes(self_cw.controller_query)) {
                    node.hidden = false;
                } else {
                    node.hidden = true;
                }
            });
        },
        _returnListaCapasConsulta: function _returnListaCapasConsulta() {
            var nodeContainer_cw = dojo.query(".container_cw");
            dojo.toggleClass(nodeContainer_cw[0], 'active');
            this.ListaCapasConsulta.hidden = false;
        },
        _addEventToTabsOptions: function _addEventToTabsOptions() {
            dojo.query('.opcion_cw').on('click', this._connectTabsWithOptionContainer);
        },
        _connectTabsWithOptionContainer: function _connectTabsWithOptionContainer(evt) {
            var option = evt.currentTarget.innerText.toLowerCase();
            if (evt.currentTarget.classList.contains('is-active')) {
                return;
            };
            dojo.query('.opcion_cw').forEach(function (node) {
                var container_option = self_cw[node.id + '_' + node.classList[0]];
                if (node.innerText.toLowerCase() == option) {
                    node.classList.toggle('is-active');
                    container_option.classList.toggle('active');
                } else {
                    node.classList.remove('is-active');
                    container_option.classList.remove('active');
                }
            });
        },
        _validateRucNumber: function _validateRucNumber(evt) {
            var val = evt.currentTarget.value;
            evt.currentTarget.value = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        },
        _openPopupAutocamitcally: function _openPopupAutocamitcally(featureInfo, center, whereDefinition) {
            var query = new Query();
            query.where = whereDefinition;
            featureInfo.layerObject.queryFeatures(query, function (results) {
                self_cw.map.infoWindow.setFeatures(results.features);
                self_cw.map.infoWindow.show(center, self_cw.map.getInfoWindowAnchor(center));
                self_cw.map.centerAt(center);

                // self_cw.map.infoWindow.show(center, self_cw.map.getInfoWindowAnchor(center));
            });
        },
        _zoomDmExtentToMap: function _zoomDmExtentToMap(evt) {

            // self_cw._applyQueryDM.click()
            var id = evt.currentTarget.innerText;
            query = new Query();
            query.where = self_cw.field_codigou_dm + ' = \'' + id + '\'';
            var id_layer = self_cw.config.layer_id_dm;
            var feature = self_cw.layersMap.getLayerInfoById(id_layer);

            feature.getLayerObject().then(function (response) {
                self_cw.map.graphics.clear();
                response.queryFeatures(query, function (results) {
                    console.log(results.features);
                    if (results.features.length) {
                        var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_NULL, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 3), new Color([125, 125, 125, 0.35]));

                        var ext = results.features[0].geometry.getExtent();

                        var graphic = results.features[0].setSymbol(symbol);
                        self_cw.map.graphics.add(graphic);
                        self_cw.map.setExtent(ext, true);
                    } else {
                        self_cw._showMessage(self_cw.nls.none_element + ' ' + id + ', ' + self_cw.nls.none_reference_map);
                    }
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                });
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_service + ' ' + feature.title + '\n' + error.message, type = 'error');
            });
        },
        _zoomExtendSelected: function _zoomExtendSelected(idService, whereDefinition) {
            var query = new Query();
            query.where = whereDefinition;
            var feature = this.layersMap.getLayerInfoById(idService);
            feature.getLayerObject().then(function (results) {
                results.queryExtent(query, function (res) {
                    if (res.count) {
                        self_cw.map.setExtent(res.extent, true);
                    } else {
                        self_cw._showMessage(self_cw.nls.none_element + ' ' + whereDefinition + ', ' + self_cw.nls.none_reference_map);
                    }
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                });
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_service + ' ' + feature.title + '\n' + error.message, type = 'error');
            });
        },
        _applyQuery: function _applyQuery(evt) {
            this.busyIndicator.show();
            self_cw.ap_registros_encontrados_cw.innerHTML = '';
            switch (self_cw.controller_query) {
                case 'dc':
                    self_cw._applyQueryDC();
                    // console.log('Ejecutando proces dc');
                    break;
                case 'dm':
                    self_cw._applyQueryDM();
                    // console.log('Ejecutando proces dm');
                    break;
                default:
                    break;
            }
        },
        _populateResultsDC: function _populateResultsDC(arrayResults) {
            arrayResults.forEach(function (r, i) {
                if (self_cw.temporal_class_results) {
                    var newRow = self_cw.temporal_class_results;
                } else {
                    var newRow = dojo.clone(self_cw.ap_template_registros_resultados_cw);
                }

                newRow.style.display = 'block';

                var nodeTitle = dojo.query('.title_registros_cw', newRow)[0];
                newRow.getElementsByClassName('title_registros_cw')[0].innerText = i + 1 + '. ' + r[self_cw.field_minero_informal];
                newRow.getElementsByClassName('title_registros_cw')[0].id = r[self_cw.field_id];
                dojo.connect(nodeTitle, 'onclick', self_cw._showPopupRowSelectedClick);

                // Lista campos

                var fieldsList = [];
                fieldsList.push('<li>' + self_cw.nls.field_dc_ruc + ': ' + r[self_cw.field_m_ruc] + '</li>');
                fieldsList.push('<li>' + self_cw.nls.field_nombre_dm + ': ' + r[self_cw.field_derecho_minero] + '</li>');
                fieldsList.push('<li>' + self_cw.nls.field_codigou_dm + ': <span class="tag is-primary codigou_cw">' + r[self_cw.field_id_unidad] + '<span></li>');

                fieldsListNode = fieldsList.join('');

                newRow.getElementsByClassName('detalle_registros_resultados_cw')[0].innerHTML = fieldsListNode;

                self_cw.ap_registros_encontrados_cw.appendChild(newRow);
            });
            dojo.query('.codigou_cw').on('click', self_cw._zoomDmExtentToMap);
            this.busyIndicator.hide();
        },
        _showReinfos: function _showReinfos(evt) {
            self_cw.busyIndicator.show();
            var id = evt.currentTarget.parentElement.getAttribute('value');
            var elm = dojo.query('.ul_registro_dc_' + id);

            if (evt.currentTarget.parentElement.classList.contains('active')) {
                if (elm.length) {
                    evt.currentTarget.parentElement.removeChild(elm[0]);
                    evt.currentTarget.parentElement.classList.toggle('active');
                }
                self_cw.busyIndicator.hide();
                return;
            }

            // let id = evt.currentTarget.parentElement.getAttribute('value');
            var feature = self_cw.layersMap.getLayerInfoById(self_cw.config.layer_id_dc);

            var feature_sys = self_cw.layersMap.getLayerInfoById(self_cw.config.layer_id_dc_sys);

            var query = new Query();
            query.where = self_cw.field_id_unidad + ' = \'' + id + '\'';

            feature.setFilter(query.where);
            feature.show();

            feature_sys.setFilter(query.where);
            feature_sys.show();

            // evt.currentTarget.parentElement.classList.toggle('active')

            feature.getLayerObject().then(function (response) {
                response.queryFeatures(query, function (results) {
                    if (results.features.length) {
                        evt.target.parentElement.classList.toggle('active');
                        var rownum = results.features.length;
                        evt.target.innerText = self_cw.nls.show_reinfos + ' (' + rownum + ')';
                        var data = results.features.map(function (i) {
                            return i.attributes;
                        });
                        var lidata = data.map(function (i, index) {
                            return '<li class="registro_dc" id="' + i[self_cw.field_id] + '"><a>' + (index + 1) + '. ' + i[self_cw.field_m_ruc] + ' - ' + i[self_cw.field_minero_informal] + '</a></li>';
                        });
                        var lidataString = lidata.join('');
                        var ulnode = dojo.create('ul');
                        ulnode.innerHTML = lidataString;
                        dojo.addClass(ulnode, 'ul_registro_dc_' + id);
                        evt.target.parentElement.appendChild(ulnode);
                        dojo.query('.registro_dc').on('click', self_cw._showPopupRowSelectedClick);
                    } else {
                        self_cw._showMessage(self_cw.nls.none_element_pl);
                    };
                    self_cw.busyIndicator.hide();
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                    self_cw.busyIndicator.hide();
                });
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_service + ' ' + feature.title + '\n' + error.message, type = 'error');
                self_cw.busyIndicator.hide();
            });
        },
        _populateResultsDM: function _populateResultsDM(arrayResults) {
            arrayResults.forEach(function (r, i) {
                if (self_cw.temporal_class_results) {
                    var newRow = self_cw.temporal_class_results;
                } else {
                    var newRow = dojo.clone(self_cw.ap_template_registros_resultados_cw);
                }

                newRow.style.display = 'block';

                var nodeTitle = dojo.query('.title_registros_cw', newRow)[0];
                newRow.getElementsByClassName('title_registros_cw')[0].innerText = i + 1 + '. ' + self_cw.nls.field_codigou_dm + ': ' + r[self_cw.field_codigou_dm];
                newRow.getElementsByClassName('title_registros_cw')[0].id = r[self_cw.field_codigou_dm];
                dojo.connect(nodeTitle, 'onclick', self_cw._showPopupRowSelectedClickDM);

                // Lista campos

                var fieldsList = [];
                fieldsList.push('<li>' + self_cw.nls.field_nombre_dm + ': ' + r[self_cw.field_concesion_dm] + '</li>');
                fieldsList.push('<li>' + self_cw.nls.field_sustancia_dm + ': ' + r[self_cw.field_sustancia_dm] + '</li>');
                fieldsList.push('<li value="' + r[self_cw.field_codigou_dm] + '"><span class="tag is-primary reinfos_cw">' + self_cw.nls.show_reinfos + '<span></li>');

                fieldsListNode = fieldsList.join('');

                newRow.getElementsByClassName('detalle_registros_resultados_cw')[0].innerHTML = fieldsListNode;

                self_cw.ap_registros_encontrados_cw.appendChild(newRow);
            });
            dojo.query('.reinfos_cw').on('click', self_cw._showReinfos);
            this.busyIndicator.hide();
        },
        _showPopupRowSelectedClick: function _showPopupRowSelectedClick(evt) {
            var id_row = evt.currentTarget.id;

            var id_layer = self_cw.config.layer_id_dc;
            var id_layer_sys = self_cw.config.layer_id_dc_sys;

            var feature = self_cw.layersMap.getLayerInfoById(id_layer);
            var feature_sys = self_cw.layersMap.getLayerInfoById(id_layer_sys);

            var whereDefinition = self_cw.field_id + ' = ' + id_row;

            feature_sys.setFilter(whereDefinition);

            feature_sys.layerObject.queryFeatures(whereDefinition, function (results) {
                var center = results.features[0].geometry;
                if (!center) {
                    self_cw._showMessage(self_cw.nls.error_none_geometry);
                }
                self_cw._openPopupAutocamitcally(feature, center, whereDefinition);
            });
        },
        _openPopupAutocamitcally2: function _openPopupAutocamitcally2(featureLayer, center) {
            self_cw.map.infoWindow.setFeatures(featureLayer.features);
            self_cw.map.infoWindow.show(center, self_cw.map.getInfoWindowAnchor(center));
            self_cw.map.centerAt(center);
        },
        _showPopupRowSelectedClickDM: function _showPopupRowSelectedClickDM(evt) {
            var id_row = evt.currentTarget.id;

            var id_layer = self_cw.config.layer_id_dm;

            var feature = self_cw.layersMap.getLayerInfoById(id_layer);

            var whereDefinition = self_cw.field_codigou_dm + ' = \'' + id_row + '\'';

            query = new Query();
            query.where = whereDefinition;

            // feature_sys.setFilter(whereDefinition);

            feature.getLayerObject().then(function (response) {
                response.queryFeatures(query, function (results) {
                    if (results.features.length) {
                        var center = results.features[0].geometry.getCentroid();
                        var ext = results.features[0].geometry.getExtent();
                        self_cw._openPopupAutocamitcally2(results, center, query);
                        self_cw.map.setExtent(ext, true);
                    }
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                });
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_service + ' ' + feature.title + '\n' + error.message, type = 'error');
            });

            // feature_sys.layerObject.queryFeatures(whereDefinition, function(results) {
            //     var center = results.features[0].geometry;
            //     self_cw._openPopupAutocamitcally(feature, center, whereDefinition);
            // })
        },
        _applyQueryDC: function _applyQueryDC() {
            whereDefinitionArray = [];

            if (self_cw.input_ruc_dc_cw.value != '') {
                var ruc_dc = '(' + self_cw.field_m_ruc + ' like \'%' + self_cw.input_ruc_dc_cw.value + '%\')';
                whereDefinitionArray.push(ruc_dc);
            }

            var nombre_dc = '(lower(' + self_cw.field_minero_informal + ') like lower(\'%' + self_cw.input_nombre_dc_cw.value + '%\'))';
            whereDefinitionArray.push(nombre_dc);

            if (self_cw.select_tipo_persona_cw.value != '') {
                var tipo_persona_dc = '(' + self_cw.field_tipo_persona + ' like \'%' + self_cw.select_tipo_persona_cw.value + '%\')';
                whereDefinitionArray.push(tipo_persona_dc);
            };

            var codigou_dc = '(upper(' + self_cw.field_id_unidad + ') like upper(\'%' + self_cw.input_codigou_dc_cw.value + '%\'))';
            whereDefinitionArray.push(codigou_dc);

            var nombredm_dc = '(lower(' + self_cw.field_derecho_minero + ') like lower(\'%' + self_cw.input_nombre_dm_dc_cw.value + '%\'))';
            whereDefinitionArray.push(nombredm_dc);

            var ubigeo_dc = '(' + self_cw.field_id_ubigeo_inei + ' like \'' + self_cw.controller_ubigeo + '%\')';
            whereDefinitionArray.push(ubigeo_dc);

            var whereDefinition = whereDefinitionArray.join(' and ');
            console.log(whereDefinition);

            // Filtro a capa DC visible en la TOC
            var id = self_cw.config.layer_id_dc;
            var feature = self_cw.layersMap.getLayerInfoById(id);
            feature.setFilter(whereDefinition);
            feature.show();

            // Filtro a capa DC sistema no visible en la TOC
            var id_sys = self_cw.config.layer_id_dc_sys;
            var feature_sys = self_cw.layersMap.getLayerInfoById(id_sys);
            feature_sys.setFilter(whereDefinition);
            feature_sys.show();

            // Realizando el query a la capa
            feature.layerObject.queryFeatures(whereDefinition, function (result) {
                var rowcount = result.features.length;
                if (rowcount) {
                    self_cw.controller_layer_query = true;
                }
                self_cw.ap_indicador_resultados_cw.innerText = rowcount;
                self_cw.ap_titulo_resultados_cw.innerText = self_cw.titulo_consulta.innerText + ' encontrados';

                var data = result.features.map(function (i) {
                    return i.attributes;
                });

                self_cw._populateResultsDC(data);

                self_cw.ap_none_resultados_opcion_cw.hidden = true;
                var class_list_container_resultados = self_cw.container_resultados_opcion_cw.classList;
                if (!class_list_container_resultados.contains('active')) {
                    self_cw.container_resultados_opcion_cw.classList.toggle('active');
                }
                self_cw.ap_resultados_cw.click();
            });

            feature_sys.layerObject.queryExtent(whereDefinition, function (results) {
                if (results.count) {
                    self_cw.map.setExtent(results.extent, true);
                }
            });
        },
        _applyQueryDM: function _applyQueryDM() {
            whereDefinitionArray = [];
            var codigou_dm = '(upper(' + self_cw.field_codigou_dm + ') like upper(\'%' + self_cw.input_codigou_dm_cw.value + '%\'))';
            var nombredm_dm = '(lower(' + self_cw.field_concesion_dm + ') like lower(\'%' + self_cw.input_nombre_dm_cw.value + '%\'))';
            whereDefinitionArray.push(codigou_dm);
            whereDefinitionArray.push(nombredm_dm);

            var whereDefinition = whereDefinitionArray.join(' and ');

            // console.log(whereDefinition);

            // Filtro a capa DC visible en la TOC
            var id = self_cw.config.layer_id_dm;
            var feature = self_cw.layersMap.getLayerInfoById(id);
            feature.setFilter(whereDefinition);
            feature.show();

            var query = new Query();
            query.where = whereDefinition;

            feature.getLayerObject().then(function (response) {
                response.queryFeatures(query, function (results) {
                    var rowcount = results.features.length;
                    self_cw.ap_indicador_resultados_cw.innerText = rowcount;
                    self_cw.ap_titulo_resultados_cw.innerText = self_cw.titulo_consulta.innerText + ' encontrados';
                    if (rowcount) {
                        self_cw.controller_layer_query = true;
                    };
                    var data = results.features.map(function (i) {
                        return i.attributes;
                    });
                    self_cw._populateResultsDM(data);

                    self_cw.ap_none_resultados_opcion_cw.hidden = true;
                    var class_list_container_resultados = self_cw.container_resultados_opcion_cw.classList;
                    if (!class_list_container_resultados.contains('active')) {
                        self_cw.container_resultados_opcion_cw.classList.toggle('active');
                    }
                    self_cw.ap_resultados_cw.click();
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                    self_cw.busyIndicator.hide();
                });
                response.queryExtent(query, function (results) {
                    if (results.count) {
                        self_cw.map.setExtent(results.extent, true);
                    } else {
                        self_cw._showMessage(self_cw.nls.none_element_pl);
                    }
                }, function (error) {
                    self_cw._showMessage(self_cw.nls.error_query_feature + ' ' + feature.title + ' (' + query.where + ')\n' + error.message);
                });
            }, function (error) {
                self_cw._showMessage(self_cw.nls.error_service + ' ' + feature.title + '\n' + error.message, type = 'error');
                self_cw.busyIndicator.hide();
            });
        },
        startup: function startup() {
            this.inherited(arguments);
            console.log('Consulta_wgt::startup');
            this.busyIndicator = BusyIndicator.create({
                target: this.domNode.parentNode.parentNode.parentNode,
                backgroundOpacity: 0
            });
            this.busyIndicator.show();
            self_cw._addEventToTabsOptions();
            self_cw._addEventToLayerQuery();
            self_cw._getDataByTipoPersona();
            self_cw._getDataByDepartamento();
            this.busyIndicator.hide();
        },
        onOpen: function onOpen() {
            console.log('Consulta_wgt::onOpen');
        },
        _cleanMap: function _cleanMap() {
            this.busyIndicator.show();
            this.map.graphics.clear();
            var whereDefinition = '1=1';
            lyr_dc = this.layersMap.getLayerInfoById(this.config.layer_id_dc);
            lyr_dc_sys = this.layersMap.getLayerInfoById(this.config.layer_id_dc_sys);
            lyr_dm = this.layersMap.getLayerInfoById(this.config.layer_id_dm);
            lyr_dc.hide();
            lyr_dc_sys.hide();
            lyr_dm.hide();
            lyr_dc.setFilter(whereDefinition);
            lyr_dc_sys.setFilter(whereDefinition);
            lyr_dm.setFilter(whereDefinition);
            this.busyIndicator.hide();
            this.container_resultados_opcion_cw.classList.remove('active');
            this.ap_none_resultados_opcion_cw.hidden = false;
            this.controller_layer_query = false;
        },
        onClose: function onClose() {
            console.log('Consulta_wgt::onClose');
            if (this.controller_layer_query) {
                this._showMessage(this.nls.clean_map_question, type = 'question');
            }
        }
    }
    // onMinimize(){
    //   console.log('Consulta_wgt::onMinimize');
    // },
    // onMaximize(){
    //   console.log('Consulta_wgt::onMaximize');
    // },
    // onSignIn(credential){
    //   console.log('Consulta_wgt::onSignIn', credential);
    // },
    // onSignOut(){
    //   console.log('Consulta_wgt::onSignOut');
    // }
    // onPositionChange(){
    //   console.log('Consulta_wgt::onPositionChange');
    // },
    // resize(){
    //   console.log('Consulta_wgt::resize');
    // }
    );
});
//# sourceMappingURL=Widget.js.map
