import { GetStoreData, SetStoreData } from '../helpers/General';
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import { Alert, Linking } from 'react-native';
import { PERMISSIONS, check, RESULTS, request } from 'react-native-permissions';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';
import { isPlatformAndroid } from '../Util';
import languages from '../locales/languages';

let instanceCount = 0;

export class LocationData {
  constructor() {
    this.locationInterval = 60000 * 5; // Time (in milliseconds) between location information polls.  E.g. 60000*5 = 5 minutes
    // DEBUG: Reduce Time intervall for faster debugging
    // this.locationInterval = 5000;
  }

  getLocationData() {
    return GetStoreData('LOCATION_DATA').then(locationArrayString => {
      let locationArray = [];
      if (locationArrayString !== null) {
        locationArray = JSON.parse(locationArrayString);
      }

      //return locationArray;

      return [
        { latitude: 37.355935, longitude: -122.011161, time: 1586118827717 },
        { latitude: 37.333035, longitude: -122.012119, time: 1586118827716 },
        { latitude: 37.337524, longitude: -122.013767, time: 1586117927717 },
        { latitude: 37.336057, longitude: -122.013853, time: 1586114327717 },
        { latitude: 37.333387, longitude: -122.013821, time: 1586111927717 },
        { latitude: 37.331101, longitude: -122.013564, time: 1586109527717 },
        { latitude: 37.329557, longitude: -122.009348, time: 1586095127717 },
        { latitude: 37.333379, longitude: -122.011247, time: 1586080727717 },
        { latitude: 37.331912, longitude: -122.004177, time: 1586066327717 },
        { latitude: 37.328278, longitude: -122.002525, time: 1586051927717 },
        { latitude: 37.331016, longitude: -122.000326, time: 1586037527717 },
        { latitude: 37.333184, longitude: -122.002362, time: 1586023127717 },
        { latitude: 37.334184, longitude: -122.002362, time: 1586008727717 },
        { latitude: 37.336184, longitude: -122.002362, time: 1585994327717 },
        { latitude: 37.336114, longitude: -122.002312, time: 1585994327718 },
        { latitude: 37.338184, longitude: -122.002362, time: 1585979927717 },
        { latitude: 37.331184, longitude: -122.019362, time: 1585907927716 },
        { latitude: 37.330184, longitude: -122.013362, time: 1585907927715 },
        { latitude: 37.338184, longitude: -122.012362, time: 1585907927717 },
        { latitude: 37.338184, longitude: -122.092362, time: 1585835927717 },
        { latitude: 37.338184, longitude: -122.049362, time: 1585763927717 },
        { latitude: 37.338184, longitude: -122.024362, time: 1585749527717 },
        { latitude: 37.338184, longitude: -122.029362, time: 1585735127717 },
        { latitude: 37.338184, longitude: -122.059362, time: 1585720727717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585691927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585591927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585491927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585441927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585391927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585331927717 },
        { latitude: 37.330184, longitude: -122.058362, time: 1585291927717 },
      ];
    });
  }

  async getPointStats() {
    const locationData = await this.getLocationData();

    let lastPoint = null;
    let firstPoint = null;
    let pointCount = 0;

    if (locationData.length) {
      lastPoint = locationData.slice(-1)[0];
      firstPoint = locationData[0];
      pointCount = locationData.length;
    }

    return {
      lastPoint,
      firstPoint,
      pointCount,
    };
  }

  saveLocation(location) {
    // Persist this location data in our local storage of time/lat/lon values
    this.getLocationData().then(locationArray => {
      // Always work in UTC, not the local time in the locationData
      let nowUTC = new Date().toISOString();
      let unixtimeUTC = Date.parse(nowUTC);
      let unixtimeUTC_28daysAgo = unixtimeUTC - 60 * 60 * 24 * 1000 * 28;

      // Curate the list of points, only keep the last 28 days
      let curated = [];
      for (let i = 0; i < locationArray.length; i++) {
        if (locationArray[i]['time'] > unixtimeUTC_28daysAgo) {
          curated.push(locationArray[i]);
        }
      }

      // Backfill the stationary points, if available
      if (curated.length >= 1) {
        let lastLocationArray = curated[curated.length - 1];
        let lastTS = lastLocationArray['time'];
        for (
          ;
          lastTS < unixtimeUTC - this.locationInterval;
          lastTS += this.locationInterval
        ) {
          curated.push(JSON.parse(JSON.stringify(lastLocationArray)));
        }
      }

      // Save the location using the current lat-lon and the
      // calculated UTC time (maybe a few milliseconds off from
      // when the GPS data was collected, but that's unimportant
      // for what we are doing.)
      console.log('[GPS] Saving point:', locationArray.length);
      let lat_lon_time = {
        latitude: location['latitude'],
        longitude: location['longitude'],
        time: unixtimeUTC,
      };
      curated.push(lat_lon_time);

      SetStoreData('LOCATION_DATA', curated);
    });
  }
}

export default class LocationServices {
  static start() {
    const locationData = new LocationData();

    instanceCount += 1;
    if (instanceCount > 1) {
      BackgroundGeolocation.start();
      return;
    }

    PushNotification.configure({
      // (required) Called when a remote or local notification is opened or received
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
        // required on iOS only (see fetchCompletionHandler docs: https://github.com/react-native-community/react-native-push-notification-ios)
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },
      requestPermissions: true,
    });

    // PushNotificationIOS.requestPermissions();
    BackgroundGeolocation.configure({
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 5,
      distanceFilter: 5,
      notificationTitle: languages.t('label.location_enabled_title'),
      notificationText: languages.t('label.location_enabled_message'),
      debug: false, // when true, it beeps every time a loc is read
      startOnBoot: true,
      stopOnTerminate: false,
      locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,

      interval: locationData.locationInterval,
      fastestInterval: locationData.locationInterval,
      activitiesInterval: locationData.locationInterval,

      activityType: 'AutomotiveNavigation',
      pauseLocationUpdates: false,
      saveBatteryOnBackground: true,
      stopOnStillActivity: false,
    });

    BackgroundGeolocation.on('location', location => {
      // handle your locations here
      /* SAMPLE OF LOCATION DATA OBJECT
                {
                  "accuracy": 20, "altitude": 5, "id": 114, "isFromMockProvider": false,
                  "latitude": 37.4219983, "locationProvider": 1, "longitude": -122.084,
                  "mockLocationsEnabled": false, "provider": "fused", "speed": 0,
                  "time": 1583696413000
                }
            */
      // to perform long running operation on iOS
      // you need to create background task
      BackgroundGeolocation.startTask(taskKey => {
        // execute long running task
        // eg. ajax post location
        // IMPORTANT: task has to be ended by endTask
        locationData.saveLocation(location);
        BackgroundGeolocation.endTask(taskKey);
      });
    });

    if (isPlatformAndroid()) {
      // This feature only is present on Android.
      BackgroundGeolocation.headlessTask(async event => {
        // Application was shutdown, but the headless mechanism allows us
        // to capture events in the background.  (On Android, at least)
        if (event.name === 'location' || event.name === 'stationary') {
          locationData.saveLocation(event.params);
        }
      });
    }

    BackgroundGeolocation.on('stationary', stationaryLocation => {
      // handle stationary locations here
      // Actions.sendLocation(stationaryLocation);
      BackgroundGeolocation.startTask(taskKey => {
        // execute long running task
        // eg. ajax post location
        // IMPORTANT: task has to be ended by endTask

        // For capturing stationaryLocation. Note that it hasn't been
        // tested as I couldn't produce stationaryLocation callback in emulator
        // but since the plugin documentation mentions it, no reason to keep
        // it empty I believe.
        locationData.saveLocation(stationaryLocation);
        BackgroundGeolocation.endTask(taskKey);
      });
      console.log('[INFO] stationaryLocation:', stationaryLocation);
    });

    BackgroundGeolocation.on('error', error => {
      console.log('[ERROR] BackgroundGeolocation error:', error);
    });

    BackgroundGeolocation.on('start', () => {
      console.log('[INFO] BackgroundGeolocation service has been started');
    });

    BackgroundGeolocation.on('stop', () => {
      console.log('[INFO] BackgroundGeolocation service has been stopped');
    });

    BackgroundGeolocation.on('authorization', status => {
      console.log(
        '[INFO] BackgroundGeolocation authorization status: ' + status,
      );

      if (status !== BackgroundGeolocation.AUTHORIZED) {
        // we need to set delay or otherwise alert may not be shown
        // setTimeout(
        //   () =>
        //     Alert.alert(
        //       languages.t('label.require_location_information_title'),
        //       languages.t('label.require_location_information_message'),
        //       [
        //         {
        //           text: languages.t('label.yes'),
        //           onPress: () => BackgroundGeolocation.showAppSettings(),
        //         },
        //         {
        //           text: languages.t('label.no'),
        //           onPress: () => console.log('No Pressed'),
        //           style: 'cancel',
        //         },
        //       ],
        //     ),
        //   1000,
        // );
      } else {
        BackgroundGeolocation.start(); //triggers start on start event

        // TODO: We reach this point on Android when location services are toggled off/on.
        //       When this fires, check if they are off and show a Notification in the tray
      }
    });

    BackgroundGeolocation.on('background', () => {
      console.log('[INFO] App is in background');
    });

    BackgroundGeolocation.on('foreground', () => {
      console.log('[INFO] App is in foreground');
    });

    BackgroundGeolocation.on('abort_requested', () => {
      console.log('[INFO] Server responded with 285 Updates Not Required');
      // Here we can decide whether we want stop the updates or not.
      // If you've configured the server to return 285, then it means the server does not require further update.
      // So the normal thing to do here would be to `BackgroundGeolocation.stop()`.
      // But you might be counting on it to receive location updates in the UI, so you could just reconfigure and set `url` to null.
    });

    BackgroundGeolocation.on('http_authorization', () => {
      console.log('[INFO] App needs to authorize the http requests');
    });

    BackgroundGeolocation.on('stop', () => {
      PushNotification.localNotification({
        title: 'Location Tracking Was Disabled',
        message: 'Private Kit requires location services.',
      });
      console.log('[INFO] stop');
    });

    BackgroundGeolocation.on('stationary', () => {
      console.log('[INFO] stationary');
    });

    BackgroundGeolocation.checkStatus(status => {
      console.log(
        '[INFO] BackgroundGeolocation service is running',
        status.isRunning,
      );
      console.log(
        '[INFO] BackgroundGeolocation services enabled',
        status.locationServicesEnabled,
      );
      console.log(
        '[INFO] BackgroundGeolocation auth status: ' + status.authorization,
      );

      BackgroundGeolocation.start(); //triggers start on start event

      if (!status.locationServicesEnabled) {
        // we need to set delay or otherwise alert may not be shown
        // setTimeout(
        //   () =>
        //     Alert.alert(
        //       languages.t('label.require_location_services_title'),
        //       languages.t('label.require_location_services_message'),
        //       [
        //         {
        //           text: languages.t('label.yes'),
        //           onPress: () => {
        //             if (isPlatformAndroid()) {
        //               // showLocationSettings() only works for android
        //               BackgroundGeolocation.showLocationSettings();
        //             } else {
        //               Linking.openURL('App-Prefs:Privacy'); // Deeplinking method for iOS
        //             }
        //           },
        //         },
        //         {
        //           text: languages.t('label.no'),
        //           onPress: () => console.log('No Pressed'),
        //           style: 'cancel',
        //         },
        //       ],
        //     ),
        //   1000,
        // );
      } else if (!status.authorization) {
        // we need to set delay or otherwise alert may not be shown
        // setTimeout(
        //   () =>
        //     Alert.alert(
        //       languages.t('label.require_location_information_title'),
        //       languages.t('label.require_location_information_message'),
        //       [
        //         {
        //           text: languages.t('label.yes'),
        //           onPress: () => BackgroundGeolocation.showAppSettings(),
        //         },
        //         {
        //           text: languages.t('label.no'),
        //           onPress: () => console.log('No Pressed'),
        //           style: 'cancel',
        //         },
        //       ],
        //     ),
        //   1000,
        // );
      }
      // else if (!status.isRunning) {
      // } // commented as it was not being used
    });

    // you can also just start without checking for status
    // BackgroundGeolocation.start();
  }

  static stop(nav) {
    // unregister all event listeners
    PushNotification.localNotification({
      title: languages.t('label.location_disabled_title'),
      message: languages.t('label.location_disabled_message'),
    });
    BackgroundGeolocation.removeAllListeners();
    BackgroundGeolocation.stop();
    instanceCount -= 1;
    SetStoreData('PARTICIPATE', 'false').then(() => {
      // nav.navigate('LocationTrackingScreen', {});
    });
  }
}
