import React, { Component } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
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
import LinearGradient from 'react-native-linear-gradient';

const width = Dimensions.get('window').width;
const base64 = RNFetchBlob.base64;

class UploadScreen extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
    };
  }

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  handleBackPress() {
    this.props.navigation.goBack();
    return true;
  }

  async onShare() {
    try {
      this.setState({
        isLoading: true,
      });
      const location = new LocationData();
      const locationData = await location.getLocationData();
      const dataToUpload = [];
      locationData.forEach(element => {
        if (!element.uploaded) {
          dataToUpload.push({
            latitude: element.latitude,
            longitude: element.longitude,
            time: element.time,
          });
        }
      });
      // locationData.filter(location => !location.uploaded);
      console.log(dataToUpload);
      if (dataToUpload.length === 0) {
        this.setState({
          isLoading: false,
        });
        Alert.alert(languages.t('label.upload_success'), '', [
          {
            text: languages.t('label.home_ok'),
            onPress: () => {},
          },
        ]);
        return;
      }
      const data = {
        points: dataToUpload,
      };
      try {
        let response = await fetch('https://stopcovidusa.org/api/v1/track', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        if (response.status >= 200 && response.status < 300) {
          location.markLocationAsUploaded();
          let json = await response.json();
          console.log(json);
          this.setState({
            isLoading: false,
          });
          Alert.alert(languages.t('label.upload_success'), '', [
            {
              text: languages.t('label.home_ok'),
              onPress: () => {},
            },
          ]);
        }
      } catch (errors) {
        this.setState({
          isLoading: false,
        });
        Alert.alert(errors.message, '', [
          {
            text: languages.t('label.home_ok'),
            onPress: () => {},
          },
        ]);
      }
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
          <Text style={{ fontWeight: FontWeights.BOLD, color: 'black' }}>
            {languages.t('label.upload_description_1_1')}
          </Text>
        </Text>
        <Text style={styles.textSection}>
          <Text>{languages.t('label.upload_description_2_0')}</Text>
          <Text style={{ fontWeight: FontWeights.BOLD, color: 'black' }}>
            {languages.t('label.upload_description_2_1')}
          </Text>
          <Text>{languages.t('label.upload_description_2_2')}</Text>
        </Text>
      </View>
    );
  };

  getLoading() {
    if (!this.state.isLoading) {
      return;
    }
    return (
      <View style={styles.loading} pointerEvents={'none'}>
        <ActivityIndicator size="small" color='#ffffff' />
      </View>
    );
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backArrowTouchable}
            onPress={() => this.handleBackPress()}>
            <Image style={styles.backArrow} source={backArrow} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {languages.t('label.upload_navigation_title')}
          </Text>
        </View>

        <View style={styles.main}>
          {this.getTextComponent()}
          <View style={styles.buttonWrapperContainer}>
            {this.getLoading()}
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={[Colors.RED_BUTTON, Colors.RED_TO_BUTTON]}
              style={styles.buttonContainer}>
              <TouchableOpacity
                disabled={this.state.isLoading}
                style={styles.buttonContainer}
                onPress={() => {
                  this.onShare();
                }}>
                <Text style={styles.primaryButtonText}>
                  {this.state.isLoading ? '' : languages.t('label.upload_share_info')}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  // Container covers the entire screen
  container: {
    flex: 1,
    flexDirection: 'column',
    color: Colors.PRIMARY_TEXT,
    backgroundColor: Colors.WHITE,
  },
  primaryButtonText: {
    fontWeight: FontWeights.BOLD,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ffffff',
  },
  buttonWrapperContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: width * 0.7,
    alignSelf: 'center',
    height: 50,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
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
    marginBottom: '20%',
  },
  textTitle: {
    fontSize: 24,
    fontWeight: FontWeights.SEMIBOLD,
    marginVertical: '3%',
  },
  textSection: {
    color: '#6A6A6A',
    fontSize: 16,
    marginVertical: '3%',
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

export default UploadScreen;
