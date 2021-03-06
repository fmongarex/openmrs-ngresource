/*
jshint -W026, -W116, -W098, -W003, -W068, -W069, -W004, -W033, -W030, -W117
*/
(function () {
    'use strict';

    angular
        .module('openmrs-ngresource.restServices')
        .factory('EncounterResService', EncounterResService);

    EncounterResService.$inject = ['Restangular', 'OpenmrsSettings', '$resource', '$q'];

    function EncounterResService(Restangular, OpenmrsSettings, $resource, $q) {
        var service = {
            getEncounterByUuid: getEncounterByUuid,
            saveEncounter: saveEncounter,
            getPatientEncounters: getPatientEncounters,
            voidEncounter: voidEncounter,
            getEncounterTypes: getEncounterTypes
        };

        return service;

        function getResource(cachingEnabled) {
            var v = 'custom:(uuid,encounterDatetime,' +
                'patient:(uuid,uuid),form:(uuid,name),' +
                'location:ref,encounterType:ref,provider:ref,' +
                'obs:(uuid,obsDatetime,concept:(uuid,uuid),value:ref,groupMembers))';
            return $resource(OpenmrsSettings.getCurrentRestUrlBase().trim() + 'encounter/:uuid',
                { uuid: '@uuid', v: v },
                { query: { method: 'GET', isArray: false, cache: cachingEnabled? true: false } });
        }

        function voidEncounter(uuid, successCallback, errorCallback) {
            Restangular.one('encounter', uuid).remove().then(function (response) {
                if (typeof successCallback === 'function') {
                    successCallback(response);
                }
            }, function (error) {
                if (typeof errorCallback === 'function') {
                    errorCallback(error);
                }
            });
        }

        function getEncounterByUuid(params, successCallback, errorCallback, cachingEnabled) {
            var objParams = {};
            var _customDefaultRep = 'custom:(uuid,encounterDatetime,' +
                'patient:(uuid,uuid,identifiers),form:(uuid,name),' +
                'location:ref,encounterType:ref,provider:ref,orders:full,' +
                'obs:(uuid,obsDatetime,concept:(uuid,uuid,name:(display)),value:ref,groupMembers))';

            if (angular.isDefined(params) && typeof params === 'string') {
                var encounterUuid = params;
                objParams = { 'encounter': encounterUuid, 'v': _customDefaultRep };
            } else {
                objParams = {
                    'encounter': params.uuid,
                    'v': params.rep || _customDefaultRep
                };
            }
            Restangular.one('encounter', objParams.encounter).withHttpConfig({ cache: cachingEnabled? true: false}).get({ v: objParams.v }).then(function (data) {
                _successCallbackHandler(successCallback, data);
            },
                function (error) {
                    console.log('An error occured while attempting to fetch encounter ' +
                        'with uuid ' + params.patientUuid);
                    if (typeof errorCallback === 'function') errorCallback(error);
                });
        }

        function saveEncounter(encounter, successCallback, errorCallback) {

            var _encounter = JSON.parse(encounter);
            var encounterResource = getResource();

            if (_encounter.uuid !== undefined) {
                var uuid = _encounter.uuid;
                delete _encounter['uuid'];

                encounterResource.save({ uuid: uuid }, JSON.stringify(_encounter)).$promise
                    .then(function (data) {
                        console.log('Encounter saved successfully');
                        if (typeof successCallback === 'function') successCallback(data);
                    })
                    .catch(function (error) {
                        console.log('Error saving encounter');
                        if (typeof errorCallback === 'function')
                            errorCallback(error);
                    });
            }
            else {
                encounterResource.save(encounter).$promise
                    .then(function (data) {
                        console.log('Encounter saved successfully');
                        if (typeof successCallback === 'function')
                            successCallback(data);
                    })
                    .catch(function (error) {
                        console.log('Error saving encounter');
                        if (typeof errorCallback === 'function')
                            errorCallback(error);
                    });
            }
        }

        function getPatientEncounters(params, successCallback, errorCallback, cachingEnabled) {
            var objParams = {};

            // Don't include obs by default
            var _customDefaultRep = 'custom:(uuid,encounterDatetime,' +
                'patient:(uuid,uuid),form:(uuid,name),' +
                'location:ref,encounterType:ref,provider:ref)';

            if (angular.isDefined(params) && typeof params === 'string') {
                var patientUuid = params;
                objParams = { 'patient': patientUuid, 'v': _customDefaultRep }
            } else {
                var v = params.rep || params.v;
                objParams = {
                    'patient': params.patientUuid,
                    'v': v || _customDefaultRep
                };

                /* jshint ignore: start */
                delete params.patientUuid;
                delete params.rep;
                /* jshint ignore: end */

                //Add objParams to params and assign it back objParams
                params.patient = objParams.patient;
                params.v = objParams.v;

                objParams = params;
            }    
                
            var promise = Restangular.one('encounter').withHttpConfig({ cache: cachingEnabled? true: false})
                              .get(objParams).then(function(data) {
                                if (angular.isDefined(data.results)) data = data.results;
                                return $q.resolve(data.reverse());
                              }, function (error) {
                                console.error('An error occured while attempting to fetch encounters ' +
                                    'for patient with uuid ' + params.patientUuid);
                                return $q.reject(error);
                              });
                              
            if(typeof successCallback === 'function') {
              return promise.then(function (data) {
                  successCallback(data);
              }, function (error) {
                  if (typeof errorCallback === 'function') errorCallback(error);
              });
            } else {
              //Just return the promise
              return promise;
            }      
        }
        
        /**
         * getEncounterTypes fetches encounter types currently defined in the system
         * @param params: either a simple string standing for desired representation or
         *        an object which can have a v(representation) and caching (true/false)
         * @return a promise
         */ 
        function getEncounterTypes(params) {
          var baseUrl = OpenmrsSettings.getCurrentRestUrlBase().trim() + 'encountertype'; 
          if(params) {
            if(typeof params === 'string') {
              var type = $resource(baseUrl, {v:params}, {
                query: { method: 'GET', isArray:false, cache: true}
              });
            } else {
              // Assume an object
                var type = $resource(baseUrl, {v:params.v}, {
                  query: { 
                    method: 'GET',
                    isArray:false,
                    cache: params.caching ? true : false}
                });
            }
          } else {
            //No params passed
            var type = $resource(baseUrl, {}, {
              query: { method: 'GET', isArray:false, cache: true}
            });
          }
          
          return type.query().$promise;
        }
        
        function _successCallbackHandler(successCallback, data) {
            if (typeof successCallback !== 'function') {
                console.log('Error: You need a callback function to process' +
                    ' results');
                return;
            }
            successCallback(data);
        }
    }
})();
