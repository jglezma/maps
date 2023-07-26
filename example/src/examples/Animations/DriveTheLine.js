import React, { useState, useEffect, useRef } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { View, StyleSheet, Switch, Text, Image } from 'react-native';
import { Button } from '@rneui/base';
import { lineString as makeLineString } from '@turf/helpers';
import { point } from '@turf/helpers';
import Page from '../common/Page';
import * as Animatable from 'react-native-animatable';
import exampleIcon from '../../assets/example.png';
import RouteSimulator from '../../utils/RouteSimulator';
import { directionsClient } from '../../MapboxClient';
import sheet from '../../styles/sheet';
import { SF_OFFICE_COORDINATE } from '../../utils';
import PulseCircleLayer from '../common/PulseCircleLayer';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const SF_ZOO_COORDINATE = [-122.505412, 37.737463];

const DESTINATIONS = [
  [-122.505412, 37.737463], // Destination 1
  [-122.490442, 37.769901], // Destination 2
  [-122.468170, 37.771974], // Destination 3
  [-122.451839, 37.759218], // Destination 4
];

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'blue',
    borderRadius: 3,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 50,
  },
  modeText: {
    fontSize: 16,
    marginRight: 10,
  },
  buttonCnt: {
    backgroundColor: 'transparent',
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  pulsingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(49, 76, 205, 0.6)',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tinyLogo: {
    width: 80,
    borderRadius: 40,
    height: 80,
    position: 'absolute',
    backgroundColor: 'white',
  },
  circle: {
    width: 300,
    borderRadius: 150,
    height: 300,
    position: 'absolute',
    borderColor: '#e91e63',
    borderWidth: 4,
    backgroundColor: '#ff6090',
  },
});

const stylesShape = {
  icon: {
    iconImage: 'icon',
    iconAllowOverlap: true,
  },
};

const layerStyles = {
  origin: {
    circleRadius: 5,
    circleColor: 'white',
  },
  destination: {
    circleRadius: 5,
    circleColor: 'white',
  },
  route: {
    lineColor: 'yellow',
    lineCap: MapboxGL.LineJoin.Round,
    lineWidth: 3,
    lineOpacity: 0.84,
  },
  progress: {
    lineColor: '#314ccd',
    lineWidth: 3,
  },
};

const DriveTheLine = () => {
  const [route, setRoute] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [routeSimulator, setRouteSimulator] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);
  const mapRef = useRef(null);
  const pulseAnimation = useSharedValue(0);

  const animatePulse = () => {
    pulseAnimation.value = withTiming(1, {
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
    }, () => {
      pulseAnimation.value = withTiming(0, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }, () => runOnJS(animatePulse)()); // Wrap the recursive call in runOnJS to execute it on the JS thread
    });
  };

  const handleDestinationPress = (destination) => {
    setSelectedDestination(destination);
    setDestinationPosition(destination);
  };

  const renderRouteToDestination = () => {
    if (!destinationPosition || !route) {
      return null;
    }
  
    const fetchDirections = async () => {
      const reqOptions = {
        waypoints: [
          { coordinates: [currentLocation.longitude, currentLocation.latitude] },
          { coordinates: destinationPosition },
        ],
        profile: 'walking',
        geometries: 'geojson',
      };
  
      const res = await directionsClient.getDirections(reqOptions).send();
      const routeCoordinates = res.body.routes[0].geometry.coordinates;
      const routeLineString = makeLineString(routeCoordinates);
  
      setRoute(routeLineString);
    };
  
    fetchDirections();
  
    return (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
        <MapboxGL.LineLayer
          id="routeFill"
          style={layerStyles.route}
          belowLayerID="originInnerCircle"
        />
      </MapboxGL.ShapeSource>
    );
  };

  useEffect(() => {
    if (selectedDestination) {
      const fetchDirections = async () => {
        const reqOptions = {
          waypoints: [
            { coordinates: [currentLocation.longitude, currentLocation.latitude] },
            { coordinates: selectedDestination },
          ],
          profile: 'walking',
          geometries: 'geojson',
        };

        const res = await directionsClient.getDirections(reqOptions).send();
        const routeCoordinates = res.body.routes[0].geometry.coordinates;
        const routeLineString = makeLineString(routeCoordinates);

        setRoute(routeLineString);
      };

      fetchDirections();
    }
  }, [selectedDestination]);

  const renderDestinations = () => {
    return DESTINATIONS.map((destination, index) => (

      <><MapboxGL.ShapeSource
        key={index} id={`destination_${index}`} shape={point(destination)}
        hitbox={{ width: 20, height: 20 }}
      >
        <MapboxGL.Animated.SymbolLayer
          id={`destination_${index}_symbol`}
          minZoomLevel={1}
          style={{
            iconImage: 'icon',
            iconSize: pulseAnimation.value,
            iconAllowOverlap: true,
          }} />
      </MapboxGL.ShapeSource>
      <MapboxGL.Images images={{ icon: exampleIcon }} /></>
    ));
  };

  useEffect(() => {
    animatePulse(); // Start the pulse animation when the component mounts
  }, []);

  const onStart = () => {
    const simulator = new RouteSimulator(route);
    simulator.addListener((point) => setCurrentPoint(point));
    simulator.start();
    setRouteSimulator(simulator);
  };



  useEffect(() => {
    const fetchDirections = async () => {
      const reqOptions = {
        waypoints: [
          { coordinates: SF_OFFICE_COORDINATE },
          { coordinates: SF_ZOO_COORDINATE },
        ],
        profile: 'walking',
        geometries: 'geojson',
      };

      const res = await directionsClient.getDirections(reqOptions).send();

      setRoute(makeLineString(res.body.routes[0].geometry.coordinates));
    };

    fetchDirections();

    return () => {
      if (routeSimulator) {
        routeSimulator.stop();
      }
    };
  }, []);

  const renderRoute = () => {
    if (!route) {
      return null;
    }

    return (
      <MapboxGL.ShapeSource id="routeSource" shape={route}>
          <MapboxGL.LineLayer
            id="routeFill"
            style={layerStyles.route}
            belowLayerID="originInnerCircle"
          />
      </MapboxGL.ShapeSource>
    );
  };

  useEffect(() => {
    if (selectedDestination) {
      renderRouteToDestination();
    }
  }, [selectedDestination]);

  const renderCurrentPoint = () => {
    if (!currentPoint) {
      return null;
    }
    return (
      <PulseCircleLayer
        shape={currentPoint}
        aboveLayerID="destinationInnerCircle"
      />
    );
  };

  const renderProgressLine = () => {
    if (!currentPoint) {
      return null;
    }

    const { nearestIndex } = currentPoint.properties;
    const coords = route.geometry.coordinates.filter((c, i) => i <= nearestIndex);
    coords.push(currentPoint.geometry.coordinates);

    if (coords.length < 2) {
      return null;
    }

    const lineString = makeLineString(coords);
    return (
      <MapboxGL.Animated.ShapeSource id="progressSource" shape={lineString}>
        <MapboxGL.Animated.LineLayer
          id="progressFill"
          style={layerStyles.progress}
          aboveLayerID="routeFill"
        />
      </MapboxGL.Animated.ShapeSource>
    );
  };

  const renderOrigin = () => {
    let backgroundColor = 'white';

    if (currentPoint) {
      backgroundColor = '#314ccd';
    }

    const style = [layerStyles.origin, { circleColor: backgroundColor }];

    return (
      <MapboxGL.ShapeSource id="origin" shape={point(SF_OFFICE_COORDINATE)}>
        <MapboxGL.Animated.CircleLayer id="originInnerCircle" style={style} />
      </MapboxGL.ShapeSource>
    );
  };

  const renderActions =()=> {
    if (routeSimulator) {
      return null;
    }
    return (
      <View style={styles.buttonCnt}>
        <Button
          raised
          title="Buscar"
          onPress={onStart}
          style={styles.button}
          disabled={!route}
        />
      </View>
    );
  }

  const toggleTheme = () => {
    setIsDarkMode(prevState => !prevState);
  };

  return (
    <Page>
      <View style={styles.modeToggleContainer}>
        <Text style={styles.modeText}>Modo Claro</Text>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          thumbColor="#fff"
          trackColor={{true: '#5e5e5e', false: '#c4c4c4'}}
        />
        <Text style={styles.modeText}>Modo Oscuro</Text>
      </View>
      <MapboxGL.MapView
        ref={mapRef}
        style={sheet.matchParent}
        zoomLevel={15}
        styleURL={isDarkMode ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Light}
      >
        <MapboxGL.Camera
          animationMode="flyTo"
          animationDuration={2000}
          zoomLevel={15}
          pitch={45}
          centerCoordinate={[-122.452652, 37.762963]}
        />
        <MapboxGL.UserLocation />

        {renderOrigin()}
        {renderRoute()}
        {renderCurrentPoint()}
        {renderProgressLine()}
        {renderDestinations()}
        <MapboxGL.ShapeSource
          id="destination"
          shape={point(SF_ZOO_COORDINATE)}
        >
          <MapboxGL.CircleLayer
            id="destinationInnerCircle"
            style={layerStyles.destination}
          />
        </MapboxGL.ShapeSource>
        

          
          {/* <Animatable.View
          animation="slideInUp" // Animación para desplazar el círculo hacia arriba (puedes ajustarla según tus necesidades)
          iterationCount="infinite" // Repetir la animación infinitamente
          duration={2000} // Duración de cada iteración de la animación
          style={[
            styles.pulsingCircle,
            pulsingCircleStyle, // Ajustar posición según las coordenadas del círculo
          ]}
        >
          <Image
            style={styles.tinyLogo}
            source={{
              uri: 'https://reactnative.dev/img/tiny_logo.png',
            }}
          />
        </Animatable.View> */}
      </MapboxGL.MapView>

      {renderActions()}
    </Page>
  );
};

export default DriveTheLine;
