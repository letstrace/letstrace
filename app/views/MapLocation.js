import React, { Component } from 'react';

import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  checkNotifications,
  requestNotifications,
} from 'react-native-permissions';
import languages from '../locales/languages';
import ButtonWrapper from '../components/ButtonWrapper';
import Colors from '../constants/colors';
import { SetStoreData } from '../helpers/General';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Polyline,
  Circle,
} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { isPlatformiOS } from './../Util';
import BottomSheet from 'reanimated-bottom-sheet';
import { SvgXml } from 'react-native-svg';
import fontFamily from '../constants/fonts';
import LocationServices, { LocationData } from '../services/LocationService';
import NavigationBarWrapper from '../components/NavigationBarWrapper';
import mapCurrentLocationIcon from './../assets/svgs/map-current-location';
import mapSmallMarkerIcon from './../assets/svgs/map-small-marker';

const width = Dimensions.get('window').width;

const str = (text) => {
  return languages.t(`map.${text}`);
}

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

const BSDivider = ({ style }) => {
  return (
    <View
      style={[style, {
        backgroundColor: Colors.DIVIDER,
        height: 1,
      }]} />
  );
};

const BSDateDetailSectionHeader = ({ prefixTitle, title }) => {
  const prefix = (text) => {
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
      <View style={{
        margin: '3%',
      }}>
        <Text style={{
          flex: 1
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

const BSDateDetailSectionRow = ({ showIcon, title, date, showDivider }) => {
  const iconSize = 25;
  const icon = (showIcon) => {
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
      <View style={{
        marginVertical: '3%',
        marginRight: '3%',
      }}>
        <View style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            width: iconSize,
            height: iconSize,
          }}>
            {icon(showIcon)}
          </View>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            maxWidth: '100%',
          }}>
            <Text style={{
              fontSize: 14,
              fontFamily: fontFamily.primaryMedium,
              color: Colors.BLACK,
              alignSelf: 'center',
              flex: 1,
            }}>{title}</Text>
            <Text style={{
              fontSize: 14,
              fontFamily: fontFamily.primaryMedium,
              color: Colors.GRAY_TEXT,
              alignSelf: 'center',
              paddingLeft: '2%',
            }}>{date}</Text>
          </View>
        </View>
      </View>
      {showDivider && <BSDivider
        style={{
          marginLeft: iconSize
        }}
      />}
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
      locationDataForCircle: [],
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
  }

  backToMain() {
    this.props.navigation.goBack();
  }

  async getDeviceLocations() {
    const locationData = new LocationData();
    const fullLocationData = await locationData.getLocationData();
    fullLocationData.sort((a, b) => (a.time < b.time ? 1 : -1));
    this.setState({
      fullLocationData,
    });

    const locationDataForLine = [];
    const locationDataForCircle = [];
    for (let i = 0; i < fullLocationData.length; i++) {
      const location = fullLocationData[i];
      locationDataForLine.push({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      locationDataForCircle.push({
        key: `circle ${i}`,
        center: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
    }
    this.setState({
      locationDataForLine,
      locationDataForCircle,
    });
  }

  getCurrentLocation(position) {
    if (position && position.coords) {
      this.setState({
        region: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
      });
    }
  }

  getTodayYesterdayDate() {
    const currentTime = new Date();
    const today = covertToDate(Date.parse(currentTime));
    currentTime.setDate(currentTime.getDate() - 1)
    const yesterday = covertToDate(Date.parse(currentTime));
    return {
      today,
      yesterday
    }
  }

  getBottomSheetDateDetailContent(dates, allDates) {
    const { today, yesterday } = this.getTodayYesterdayDate();
    const getPrefixTitle = (date) => {
      if (date === today) {
        return str('today');
      } else if (date === yesterday) {
        return str('yesterday');
      }
    }

    const getChildren = (date) => {
      const getDate = date => (new Date(date)).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      const allPoints = allDates[date];
      if (allPoints && allPoints.length) {
        const toRender = [];
        for (let i = 0; i < allPoints.length; i++) {
          const point = allPoints[i];
          toRender.push(<View key={`row_${i}`}>
            <BSDateDetailSectionRow
              showIcon={i === 0}
              title={str('place_you_been')}
              date={getDate(point.time)}
              showDivider={i !== allPoints.length - 1}
            />
          </View>);
        }
        return toRender;
      }
    };

    return dates.map((date) => {
      return (
        <View key={date}>
          <BSDateDetailSectionHeader prefixTitle={getPrefixTitle(date)} title={date} />
          {getChildren(date)}
        </View>);
    });
  }

  renderContent() {
    const dates = [];
    const points = {};
    for (let location of this.state.fullLocationData) {
      const formattedDate = covertToDate(location.time);
      if (dates.length !== 0 && formattedDate === dates[dates.length - 1]) {
        points[formattedDate].push(location);
      } else {
        dates.push(formattedDate);
        points[formattedDate] = [location];
      }
    }

    return (
      <View onLayout={this.onLayoutContent} style={{
        backgroundColor: Colors.WHITE,
        height: '100%',
      }}>
        <ScrollView style={{
          backgroundColor: Colors.WHITE,
        }}>
          <View style={{ marginHorizontal: '4%' }}>
            {this.getBottomSheetDateDetailContent(dates, points)}
          </View>
        </ScrollView>
      </View>
    );
  }

  renderHeader() {
    const iconSize = 25;
    const circleSize = iconSize * 1.8;
    return (<>
      <View style={{
        margin: 5,
        width: circleSize,
        alignSelf: 'flex-end',
        position: 'absolute',
        bottom: circleSize,
        right: 6
      }}>
        <TouchableOpacity
          onPress={() => {
            this.setState({ region: this.state.region });
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
            shadowOffset: { width: 0, height: 4, },
            shadowColor: Colors.PURPLE_SHADOW,
            shadowOpacity: 0.3,
          }}>
          <SvgXml
            xml={mapCurrentLocationIcon}
            style={{
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
      <NavigationBarWrapper
        title={str('map')}
        onBackPress={this.backToMain}>
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
              strokeWidth={1}
            />
            {this.state.locationDataForCircle.map(circle => (
              <Circle
                key={circle.key}
                center={circle.center}
                radius={3}
                lineJoin='round'
                strokeColor={Colors.MAP_LINE_STROKE}
                fillColor={Colors.MAP_LINE_STROKE}
              />
            ))}
          </MapView>
          <BottomSheet
            ref={this.bottomSheet}
            snapPoints={['35%']}
            initialSnap={0}
            renderContent={this.renderContent}
            renderHeader={this.renderHeader}
          />
        </View>
      </NavigationBarWrapper>
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
    width: 40,
    height: 6,
    borderRadius: 4,
    backgroundColor: Colors.BOTTOM_SHEET_HEADER_INDICATOR,
    marginBottom: 8,
  },
});

export default MapLocation;
