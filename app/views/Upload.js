import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import PropTypes from 'prop-types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import RNFetchBlob from 'rn-fetch-blob';
import Share from 'react-native-share';
import Colors from '../constants/colors';
import { GetStoreData } from '../helpers/General';
import { timeSincePoint } from '../helpers/convertPointsToString';
import LocationServices, { LocationData } from '../services/LocationService';
import backArrow from './../assets/images/backArrow.png';
import languages from './../locales/languages';
import ButtonWrapper from '../components/ButtonWrapper';
import FontWeights from '../constants/fontWeights';

const width = Dimensions.get('window').width;
const base64 = RNFetchBlob.base64;

function ExportScreen({ shareButtonDisabled }) {
  const [pointStats, setPointStats] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(shareButtonDisabled);
  const { navigate } = useNavigation();

  function handleBackPress() {
    navigate('LocationTrackingScreen', {});
    return true;
  }

  useFocusEffect(
    React.useCallback(() => {
      const locationData = new LocationData();
      locationData.getPointStats().then(pointStats => {
        setPointStats(pointStats);
        setButtonDisabled(pointStats.pointCount === 0);
      });
      return () => { };
    }, []),
  );

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return function cleanup() {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  });

  function backToMain() {
    navigate('LocationTrackingScreen', {});
  }

  async function onShare() {
    try {
      let locationData = await new LocationData().getLocationData();
      console.log(locationData);
    } catch (error) {
      console.log(error.message);
    }
  }

  getTextComponent = () => {
    return (
      <View style={styles.textContainer}>
        <Text style={styles.textTitle}>
          {languages.t('label.upload_title')}
        </Text>
        <Text style={styles.textSection}>
          {languages.t('label.upload_description_0')}
        </Text>
        <Text style={styles.textSection}>
          <Text>{languages.t('label.upload_description_1_0')}</Text>
          <Text style={{ fontWeight: FontWeights.BOLD, color: 'black' }}>{languages.t('label.upload_description_1_1')}</Text>
        </Text>
        <Text style={styles.textSection}>
          <Text>{languages.t('label.upload_description_2_0')}</Text>
          <Text style={{ fontWeight: FontWeights.BOLD, color: 'black' }}>{languages.t('label.upload_description_2_1')}</Text>
          <Text>{languages.t('label.upload_description_2_2')}</Text>
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backArrowTouchable}
          onPress={() => backToMain()}>
          <Image style={styles.backArrow} source={backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{languages.t('label.upload_navigation_title')}</Text>
      </View>

      <View style={styles.main}>
        {this.getTextComponent()}
        <ButtonWrapper
          title={languages.t('label.upload_share_info')}
          onPress={onShare}
          bgColor={Colors.RED_BUTTON}
          toBgColor={Colors.RED_TO_BUTTON}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Container covers the entire screen
  container: {
    flex: 1,
    flexDirection: 'column',
    color: Colors.PRIMARY_TEXT,
    backgroundColor: Colors.WHITE,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 24,
    padding: 0,
    fontFamily: 'OpenSans-Bold',
  },
  subHeaderTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 22,
    padding: 5,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    textAlignVertical: 'top',
    // alignItems: 'center',
    padding: 20,
    width: '96%',
    alignSelf: 'center',
  },
  textContainer: {
    alignSelf: 'center',
    width: width * 0.8,
    marginBottom: '20%'
  },
  textTitle: {
    fontSize: 24,
    fontWeight: FontWeights.SEMIBOLD,
    marginVertical: '3%'
  },
  textSection: {
    color: '#6A6A6A',
    fontSize: 16,
    marginVertical: '3%'
  },
  buttonTouchable: {
    borderRadius: 12,
    backgroundColor: '#665eff',
    height: 52,
    alignSelf: 'center',
    width: width * 0.7866,
    marginTop: 30,
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'OpenSans-Bold',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  mainText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    textAlignVertical: 'center',
    padding: 20,
  },
  smallText: {
    fontSize: 10,
    lineHeight: 24,
    fontWeight: '400',
    textAlignVertical: 'center',
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(189, 195, 199,0.6)',
    alignItems: 'center',
  },
  backArrowTouchable: {
    width: 60,
    height: 60,
    paddingTop: 21,
    paddingLeft: 20,
  },
  backArrow: {
    height: 18,
    width: 18.48,
  },
  sectionDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    fontFamily: 'OpenSans-Regular',
  },
});

ExportScreen.propTypes = {
  shareButtonDisabled: PropTypes.bool,
};

ExportScreen.defaultProps = {
  shareButtonDisabled: true,
};

export default ExportScreen;
