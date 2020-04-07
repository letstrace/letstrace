import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import languages from '../locales/languages';
import Colors from '../constants/colors';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import BottomSheet from 'reanimated-bottom-sheet';
import { SvgXml } from 'react-native-svg';
import fontFamily from '../constants/fonts';
import { LocationData } from '../services/LocationService';
import NavigationBarWrapper from '../components/NavigationBarWrapper';
import mapCurrentLocationIcon from './../assets/svgs/map-current-location';
import mapSmallMarkerIcon from './../assets/svgs/map-small-marker';
import geocluster from '../helpers/PointClustering';

const str = text => {
  return languages.t(`map.${text}`);
};

const RegionDelta = 0.05;

const InitialRegion = {
  latitude: 35.692863,
  longitude: -98.090517,
  latitudeDelta: 55,
  longitudeDelta: 55,
};

const covertToDate = time => {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const datetime = new Date(time);
  const month = monthNames[datetime.getMonth()];
  const date = datetime.getDate();
  const year = datetime.getFullYear();
  return `${month} ${date}, ${year}`;
};

const covertToSimpleDate = time => {
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const datetime = new Date(time);
  const month = monthNames[datetime.getMonth()];
  const date = datetime.getDate();
  return `${month} ${date}`;
};

const BSDivider = ({ style }) => {
  return (
    <View
      style={[
        style,
        {
          backgroundColor: Colors.DIVIDER,
          height: 1,
        },
      ]}
    />
  );
};

const BSDateDetailSectionHeader = ({ prefixTitle, title }) => {
  const prefix = text => {
    if (prefixTitle) {
      return (
        <Text
          style={{
            fontSize: 20,
            fontFamily: fontFamily.primaryMedium,
            color: Colors.BLACK,
          }}>{`${text} `}</Text>
      );
    }
  };

  return (
    <>
      <View
        style={{
          margin: '3%',
        }}>
        <Text
          style={{
            flex: 1,
          }}>
          {prefix(prefixTitle)}
          <Text
            style={{
              fontSize: 20,
              fontFamily: fontFamily.primaryMedium,
              color: Colors.VIOLET_TEXT,
            }}>
            {title}
          </Text>
        </Text>
      </View>
      <BSDivider />
    </>
  );
};

const BubbleType = {
  selected: Colors.VIOLET_BUTTON,
  unselected: Colors.VIOLET_BUTTON_LIGHT,
  future: Colors.GRAY_BACKGROUND,
};

const BSDateBubble = ({ type, date, action }) => {
  const circleSize = 42;
  const [month, day] = date.split(' ');
  return (
    <TouchableOpacity
      onPress={() => {
        action(date);
      }}
      style={{
        marginHorizontal: 9,
        borderWidth: 1,
        borderColor: type,
        backgroundColor: type,
        alignItems: 'center',
        justifyContent: 'center',
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
      }}>
      <Text
        style={{
          color: Colors.WHITE,
          fontSize: 12,
          fontFamily: fontFamily.primaryMedium,
        }}>
        {month}
      </Text>
      <Text
        style={{
          color: Colors.WHITE,
          fontSize: 15,
          fontFamily: fontFamily.primaryMedium,
        }}>
        {day}
      </Text>
    </TouchableOpacity>
  );
};

const BSDateDetailSectionRow = ({ showIcon, title, date, showDivider }) => {
  const iconSize = 25;
  const icon = showIcon => {
    if (showIcon) {
      return (
        <SvgXml
          xml={mapSmallMarkerIcon}
          style={{
            alignSelf: 'center',
          }}
          width={iconSize}
          height={iconSize}
        />
      );
    }
  };
  return (
    <>
      <View
        style={{
          marginVertical: '3%',
          marginRight: '3%',
        }}>
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: iconSize,
              height: iconSize,
            }}>
            {icon(showIcon)}
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'space-between',
              maxWidth: '100%',
            }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fontFamily.primaryMedium,
                color: Colors.BLACK,
                alignSelf: 'center',
                flex: 1,
              }}>
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fontFamily.primaryMedium,
                color: Colors.GRAY_TEXT,
                alignSelf: 'center',
                paddingLeft: '2%',
              }}>
              {date}
            </Text>
          </View>
        </View>
      </View>
      {showDivider && (
        <BSDivider
          style={{
            marginLeft: iconSize,
          }}
        />
      )}
    </>
  );
};

class MapLocation extends Component {
  map = React.createRef();
  bottomSheet = React.createRef();

  constructor(props) {
    super(props);
    this.state = {
      region: InitialRegion,
      fullLocationData: [],
      locationDataForLine: [],
      locationDataForMarker: [],

      currentSelectedDate: covertToSimpleDate(new Date().getTime()),
    };
    Geolocation.getCurrentPosition(
      this.getCurrentLocation.bind(this),
      error => {
        console.log('get current position error: ' + JSON.stringify(error));
      },
    );

    this.getDeviceLocations();

    this.backToMain = this.backToMain.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderContent = this.renderContent.bind(this);
    this.getCurrentLocation = this.getCurrentLocation.bind(this);
  }

  backToMain() {
    this.props.navigation.goBack();
  }

  extractLocationsForMap(locationData) {
    if (!locationData) {
      return;
    }

    let output = geocluster(locationData, 1.5);
    console.log(output);

    const getDate = date =>
      new Date(date).toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
    const locationDataForLine = [];
    const locationDataForMarker = [];
    for (let i = 0; i < locationData.length; i++) {
      const location = locationData[i];
      // console.log(location);
      locationDataForLine.push({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      locationDataForMarker.push({
        key: `circle ${i}`,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        time: getDate(location.time),
      });
    }
    if (locationDataForLine.length === 1) {
      locationDataForLine.push(locationDataForLine[0]);
    }
    this.setState({
      locationDataForLine,
      locationDataForMarker,
    });
    // testing testing testing testing
    var junk = [];
    // console.log(locationDataForMarker);
    for (let i = 0; i < locationDataForMarker.length; i++) {
      const location = locationDataForMarker[i]['location'];
      junk.push([location['latitude'], location['longitude']]);
    }
    // console.log(junk);
    // let output = geocluster(junk, 1.5);
    // console.log(output);
  }

  async getDeviceLocations() {
    const locationData = new LocationData();
    const fullLocationData = await locationData.getLocationData();
    fullLocationData.sort((a, b) => (a.time < b.time ? 1 : -1));
    this.setState({
      fullLocationData,
    });

    const currentPoints = [];
    for (let location of this.state.fullLocationData) {
      const formattedDate = covertToSimpleDate(location.time);
      if (formattedDate === this.state.currentSelectedDate) {
        currentPoints.push(location);
      }
    }
    this.extractLocationsForMap(currentPoints);
  }

  getCurrentLocation(position) {
    if (position && position.coords) {
      this.setState({
        region: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: RegionDelta,
          longitudeDelta: RegionDelta,
        },
      });
    }
  }

  getTodayYesterdayDate() {
    const currentTime = new Date();
    const today = covertToDate(Date.parse(currentTime));
    currentTime.setDate(currentTime.getDate() - 1);
    const yesterday = covertToDate(Date.parse(currentTime));
    return {
      today,
      yesterday,
    };
  }

  getBottomSheetDateDetailContent(dates, allDates) {
    const { today, yesterday } = this.getTodayYesterdayDate();
    const getPrefixTitle = date => {
      if (date === today) {
        return str('today');
      } else if (date === yesterday) {
        return str('yesterday');
      }
    };

    const getChildren = date => {
      const getDate = date =>
        new Date(date).toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });
      const allPoints = allDates[date];
      if (allPoints && allPoints.length) {
        const toRender = [];
        for (let i = 0; i < allPoints.length; i++) {
          const point = allPoints[i];
          toRender.push(
            <View key={`row_${i}`}>
              <BSDateDetailSectionRow
                showIcon={i === 0}
                title={str('place_you_been')}
                date={getDate(point.time)}
                showDivider={i !== allPoints.length - 1}
              />
            </View>,
          );
        }
        return toRender;
      }
    };

    return dates.map(date => {
      return (
        <View key={date}>
          <BSDateDetailSectionHeader
            prefixTitle={getPrefixTitle(date)}
            title={date}
          />
          {getChildren(date)}
        </View>
      );
    });
  }

  getBottomSheetDateBubbleContent(dates, points) {
    // dates.reverse(); //
    // this seems like a hack..
    // but how to reverse order and scroll to last date?
    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={dates}
        renderItem={({ item }) => {
          return (
            <BSDateBubble
              type={
                this.state.currentSelectedDate === item
                  ? BubbleType.selected
                  : BubbleType.unselected
              }
              date={item}
              action={date => {
                if (this.state.currentSelectedDate === date) {
                  return;
                }
                this.setState({
                  currentSelectedDate: date,
                });
                this.extractLocationsForMap(points[date]);
                const lastPosition =
                  points[date] &&
                  points[date].length &&
                  points[date][Math.floor(points[date].length / 2)];
                if (lastPosition) {
                  this.setState({
                    region: {
                      latitude: lastPosition.latitude,
                      longitude: lastPosition.longitude,
                      latitudeDelta: RegionDelta,
                      longitudeDelta: RegionDelta,
                    },
                  });
                }
              }}
            />
          );
        }}
        keyExtractor={date => date}
      />
    );
  }

  renderContent() {
    const dates = [];
    const points = {};
    for (let location of this.state.fullLocationData) {
      const formattedDate = covertToSimpleDate(location.time);
      if (dates.length !== 0 && formattedDate === dates[dates.length - 1]) {
        points[formattedDate].push(location);
      } else {
        dates.push(formattedDate);
        points[formattedDate] = [location];
      }
    }

    return (
      // <>
      <View
        onLayout={this.onLayoutContent}
        style={{
          backgroundColor: Colors.WHITE,
          height: '100%',
        }}>
        {this.getBottomSheetDateBubbleContent(dates, points)}
      </View>

      // THE OLD TABLE VIEW
      // BUT IT BREAKS IF BOTH ARE height: '100%'
      //   <View onLayout={this.onLayoutContent} style={{
      //     backgroundColor: Colors.WHITE,
      //     height: '100%',
      //   }}>
      //     <View style={styles.placesListContainer}>
      //       {this.getBottomSheetDateDetailContent(dates, points)}
      //     </View>
      //   </View>
      // </>
    );
  }

  renderHeader() {
    const iconSize = 25;
    const circleSize = iconSize * 1.8;
    return (
      <>
        <View
          style={{
            margin: 8,
            width: circleSize,
            alignSelf: 'flex-end',
            position: 'absolute',
            bottom: circleSize,
            right: 8,
          }}>
          <TouchableOpacity
            onPress={() => {
              Geolocation.getCurrentPosition(this.getCurrentLocation, error => {
                console.log(
                  'get current position error: ' + JSON.stringify(error),
                );
              });
            }}
            style={{
              borderWidth: 1,
              borderColor: Colors.WHITE,
              backgroundColor: Colors.WHITE,
              alignItems: 'center',
              justifyContent: 'center',
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              shadowOffset: { width: 0, height: 4 },
              shadowColor: Colors.PURPLE_SHADOW,
              shadowOpacity: 0.3,
            }}>
            <SvgXml
              xml={mapCurrentLocationIcon}
              style={{
                top: 1,
                right: 1,
                alignSelf: 'center',
              }}
              width={iconSize}
              height={iconSize}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.bsHeader}>
          <View style={styles.bsHeaderIndicatorContainer}>
            <View style={styles.bsHeaderIndicator} />
          </View>
        </View>
      </>
    );
  }

  render() {
    return (
      <>
        {/* <NavigationBarWrapper
        title={str('map')}
        onBackPress={this.backToMain}> */}
        <View style={styles.mainContainer}>
          <MapView
            ref={this.map}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={this.state.region}
            showsUserLocation>
            <Polyline
              coordinates={this.state.locationDataForLine}
              strokeColor={Colors.MAP_LINE_STROKE}
              strokeWidth={2}
            />
            {this.state.locationDataForMarker.map(locationData => (
              <Marker
                key={locationData.key}
                coordinate={locationData.location}
                title={locationData.time}
                tracksViewChanges={false}
              />
            ))}
          </MapView>
          <BottomSheet
            ref={this.bottomSheet}
            snapPoints={[150]}
            initialSnap={0}
            renderContent={this.renderContent}
            renderHeader={this.renderHeader}
          />
        </View>
        {/* </NavigationBarWrapper> */}
      </>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bsHeader: {
    backgroundColor: Colors.WHITE,
    paddingTop: 18,
    paddingBottom: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  bsHeaderIndicatorContainer: {
    alignItems: 'center',
  },
  bsHeaderIndicator: {
    width: 80,
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.BOTTOM_SHEET_HEADER_INDICATOR,
    marginBottom: 8,
  },
  placesListContainer: {
    marginLeft: 21,
    marginRight: 21,
  },
});

export default MapLocation;
