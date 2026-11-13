import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Line, Circle, Path, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import {
  Shield,
  AlertTriangle,
  Lightbulb,
  Store,
  Building2,
  MapPin,
  Locate,
  LocateFixed,
  Navigation,
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Info,
} from 'lucide-react-native';
import { RouteAlternative, IncidentReport } from '@/services/api';
import { lightColors, darkColors } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';

interface SafeMapViewProps {
  origin?: { name: string; lat: number; lng: number };
  destination?: { name: string; lat: number; lng: number };
  selectedRoute: RouteAlternative | null;
  routes: RouteAlternative[];
  currentLocation: { lat: number; lng: number };
  reports?: IncidentReport[];
  isGpsTracking?: boolean;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

interface HoveredTooltip {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  x: number;
  y: number;
}

export function SafeMapView({
  origin,
  destination,
  selectedRoute,
  routes,
  currentLocation,
  reports = [],
  isGpsTracking = false,
  onLocateMe,
  isLocating = false,
}: SafeMapViewProps) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;
  const status = useTripStore((s) => s.status);
  const currentSpeed = useTripStore((s) => s.currentSpeed);
  const isTripActive = status === 'ACTIVE';
  const isSos = status === 'SOS_ACTIVE';

  const mapRef = useRef<any>(null);

  const showStreetLights = useTripStore((s) => s.showStreetLights);
  const showOpenShops = useTripStore((s) => s.showOpenShops);
  const showSafeHavens = useTripStore((s) => s.showSafeHavens);
  const showHeatmap = useTripStore((s) => s.showHeatmap);

  // Interactive Web Zoom & Pan State
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<HoveredTooltip | null>(null);

  // If GPS tracking is on OR trip is actively travelling, smoothly follow user on native map
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      try {
        const delta = isTripActive ? 0.015 : 0.035;
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
            latitudeDelta: delta,
            longitudeDelta: delta,
          },
          600
        );
      } catch {}
    }
  }, [currentLocation.lat, currentLocation.lng, isTripActive]);

  // Curated Delhi Safe Havens
  const delhiSafeHavens = [
    { name: 'Connaught Place Police Station', lat: 28.6315, lng: 77.2167, type: 'police' },
    { name: 'Parliament Street Police Post', lat: 28.6234, lng: 77.2112, type: 'police' },
    { name: 'AIIMS Emergency & Trauma', lat: 28.5672, lng: 77.2100, type: 'hospital' },
    { name: 'Safdarjung Hospital', lat: 28.5695, lng: 77.2075, type: 'hospital' },
    { name: 'Hauz Khas Police Station', lat: 28.5489, lng: 77.2058, type: 'police' },
    { name: 'India Gate Police Post', lat: 28.6128, lng: 77.2295, type: 'police' },
    { name: 'Saket Police Station', lat: 28.5244, lng: 77.2156, type: 'police' },
    { name: 'Apollo 24/7 Chemist CP', lat: 28.6320, lng: 77.2190, type: 'pharmacy' },
  ];

  // Try loading react-native-maps on native platforms
  let NativeMapView: any = null;
  let NativeMarker: any = null;
  let NativePolyline: any = null;
  let NativeCircle: any = null;

  if (Platform.OS !== 'web') {
    try {
      const Maps = require('react-native-maps');
      NativeMapView = Maps.default;
      NativeMarker = Maps.Marker;
      NativePolyline = Maps.Polyline;
      NativeCircle = Maps.Circle;
    } catch (e) {}
  }

  // Coordinate Projection for Web / Vector SVG Canvas
  const routeGeom = selectedRoute?.geometry || [
    [origin?.lat || 28.6328, origin?.lng || 77.2197],
    [destination?.lat || 28.6129, destination?.lng || 77.2295],
  ];

  const { project, polylinePoints, startPt, destPt, currPt, trailPoints } = useMemo(() => {
    const allPts: [number, number][] = [
      ...(origin ? [[origin.lat, origin.lng] as [number, number]] : []),
      ...(destination ? [[destination.lat, destination.lng] as [number, number]] : []),
      ...(currentLocation ? [[currentLocation.lat, currentLocation.lng] as [number, number]] : []),
      ...routeGeom,
    ];

    let minLat = 28.52;
    let maxLat = 28.66;
    let minLng = 77.18;
    let maxLng = 77.26;

    if (allPts.length > 0) {
      minLat = Math.min(...allPts.map((p) => p[0]));
      maxLat = Math.max(...allPts.map((p) => p[0]));
      minLng = Math.min(...allPts.map((p) => p[1]));
      maxLng = Math.max(...allPts.map((p) => p[1]));
    }

    const latSpan = Math.max(maxLat - minLat, 0.015);
    const lngSpan = Math.max(maxLng - minLng, 0.015);

    const padLat = latSpan * 0.22;
    const padLng = lngSpan * 0.22;

    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;

    const proj = (lat: number, lng: number) => {
      const x = Math.max(25, Math.min(375, ((lng - bMinLng) / (bMaxLng - bMinLng)) * 350 + 25));
      const y = Math.max(25, Math.min(375, (1 - (lat - bMinLat) / (bMaxLat - bMinLat)) * 340 + 30));
      return { x: Math.round(x), y: Math.round(y) };
    };

    const mainPoly = routeGeom
      .map(([lt, lg]) => {
        const p = proj(lt, lg);
        return `${p.x},${p.y}`;
      })
      .join(' ');

    // Compute trail up to current location
    let trailPoly = '';
    if (isTripActive && routeGeom.length > 1) {
      let closestIdx = 0;
      let closestDist = Infinity;
      routeGeom.forEach(([lt, lg], i) => {
        const d = Math.hypot(lt - currentLocation.lat, lg - currentLocation.lng);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      });
      const trailPts = routeGeom.slice(0, closestIdx + 1);
      const currP = proj(currentLocation.lat, currentLocation.lng);
      const trailStr = trailPts.map(([lt, lg]) => {
        const p = proj(lt, lg);
        return `${p.x},${p.y}`;
      });
      trailStr.push(`${currP.x},${currP.y}`);
      trailPoly = trailStr.join(' ');
    }

    return {
      project: proj,
      polylinePoints: mainPoly,
      startPt: origin ? proj(origin.lat, origin.lng) : proj(28.6328, 77.2197),
      destPt: destination ? proj(destination.lat, destination.lng) : proj(28.6129, 77.2295),
      currPt: proj(currentLocation.lat, currentLocation.lng),
      trailPoints: trailPoly,
    };
  }, [routeGeom, origin, destination, currentLocation, isTripActive]);

  // Mouse wheel zoom handler for web
  const handleWheel = (e: any) => {
    if (Platform.OS !== 'web') return;
    try {
      e.preventDefault();
    } catch {}
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((z) => Math.max(0.65, Math.min(3.5, Number((z * zoomFactor).toFixed(2)))));
  };

  // Drag pan handlers for web
  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.5, Number((z * 1.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.65, Number((z / 1.2).toFixed(2))));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setHovered(null);
  };

  // Native Maps View (Android & iOS)
  if (NativeMapView && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <NativeMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: currentLocation.lat || 28.6139,
            longitude: currentLocation.lng || 77.2090,
            latitudeDelta: isTripActive ? 0.02 : 0.08,
            longitudeDelta: isTripActive ? 0.02 : 0.08,
          }}
          showsCompass={false}
          showsUserLocation={false}
        >
          {origin && (
            <NativeMarker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title={`Start: ${origin.name}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.originMarkerPin, { backgroundColor: colors.safe }]}>
                <View style={styles.originMarkerInner} />
              </View>
            </NativeMarker>
          )}

          {destination && (
            <NativeMarker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={`Destination: ${destination.name}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.destMarkerPin, { backgroundColor: colors.danger }]}>
                <MapPin size={12} color="#ffffff" />
              </View>
            </NativeMarker>
          )}

          <NativeMarker
            coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
            title={isSos ? 'EMERGENCY SOS ACTIVE' : isTripActive ? 'You (Travelling)' : 'Your GPS Location'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.liveMarkerDot,
                {
                  backgroundColor: isSos ? colors.danger : colors.signal,
                  borderColor: '#ffffff',
                },
              ]}
            />
          </NativeMarker>

          {!isTripActive &&
            routes
              .filter((r) => r.id !== selectedRoute?.id)
              .map((r) => (
                <NativePolyline
                  key={`alt-${r.id}`}
                  coordinates={r.geometry.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                  strokeColor={colors.muted}
                  strokeWidth={3}
                  lineDashPattern={[4, 6]}
                />
              ))}

          {selectedRoute?.segments?.map((seg, idx) => {
            const segColor =
              seg.category === 'safe'
                ? colors.safe
                : seg.category === 'caution'
                ? colors.caution
                : colors.danger;
            return (
              <NativePolyline
                key={`seg-${idx}`}
                coordinates={seg.coordinates.map(([lat, lng]) => ({
                  latitude: lat,
                  longitude: lng,
                }))}
                strokeColor={segColor}
                strokeWidth={isTripActive ? 7 : 6}
              />
            );
          })}

          {selectedRoute?.weakest_stretch && (
            <NativeMarker
              coordinate={{
                latitude: selectedRoute.weakest_stretch.start_lat,
                longitude: selectedRoute.weakest_stretch.start_lng,
              }}
              title="Weakest Stretch"
              description={selectedRoute.weakest_stretch.reason}
            >
              <View style={[styles.weakStretchPin, { backgroundColor: colors.caution }]}>
                <AlertTriangle size={14} color="#ffffff" />
              </View>
            </NativeMarker>
          )}

          {showSafeHavens &&
            delhiSafeHavens.map((h, i) => (
              <NativeMarker
                key={`haven-${i}`}
                coordinate={{ latitude: h.lat, longitude: h.lng }}
                title={h.name}
              >
                <View style={[styles.poiBadge, { backgroundColor: colors.safe }]}>
                  <Shield size={12} color="#ffffff" />
                </View>
              </NativeMarker>
            ))}

          {showHeatmap &&
            reports.map((rep, idx) => (
              <NativeCircle
                key={`heat-${idx}`}
                center={{ latitude: rep.lat, longitude: rep.lng }}
                radius={200}
                fillColor={rep.severity >= 3 ? 'rgba(217, 69, 61, 0.35)' : 'rgba(224, 162, 27, 0.25)'}
                strokeColor="transparent"
              />
            ))}
        </NativeMapView>

        {isTripActive && (
          <View style={[styles.travellingNavPill, { backgroundColor: colors.surface, borderColor: colors.signal }]}>
            <View style={[styles.gpsDot, { backgroundColor: colors.signal }]} />
            <Text style={[styles.travellingNavText, { color: colors.ink }]}>
              Travelling: {(currentSpeed * 3.6).toFixed(1)} km/h
            </Text>
          </View>
        )}

        {onLocateMe && (
          <TouchableOpacity
            onPress={onLocateMe}
            style={[
              styles.gpsFab,
              {
                backgroundColor: isGpsTracking ? colors.signal : colors.surface,
                borderColor: isGpsTracking ? colors.signal : colors.line,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Center on GPS location"
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={isGpsTracking ? '#ffffff' : colors.signal} />
            ) : isGpsTracking ? (
              <LocateFixed size={20} color="#ffffff" />
            ) : (
              <Locate size={20} color={colors.ink} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Interactive High-Fidelity SVG Route Canvas (Web & Cross-Platform with Mouse Scroll & Hovers)
  const webInteractionProps =
    Platform.OS === 'web'
      ? ({
          onWheel: handleWheel,
          onMouseDown: handleMouseDown,
          onMouseMove: handleMouseMove,
          onMouseUp: handleMouseUp,
          onMouseLeave: () => {
            handleMouseUp();
            setHovered(null);
          },
        } as any)
      : {};

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#031e17' : '#eaf0f6',
          cursor: isDragging ? 'grabbing' : 'grab',
        } as any,
      ]}
      {...webInteractionProps}
    >
      {/* Background Street Grid & Delhi Corridors */}
      <View style={styles.mapGridPattern}>
        <View style={[styles.delhiRingRoad, { borderColor: isDarkMode ? '#0c4233' : '#d2dbe5' }]} />
        <View style={[styles.delhiInnerRing, { borderColor: isDarkMode ? '#155e4b' : '#c3cedc' }]} />
      </View>

      {/* Real Route SVG Visualization */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 400">
        <Defs>
          <LinearGradient id="safeRouteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>

        {/* Master Group with Pan & Zoom Transform */}
        <G
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          // SVG scaling centered at 200, 200
          origin="200, 200"
        >
          {/* Alternative routes (thin dashed) */}
          {!isTripActive &&
            routes
              .filter((r) => r.id !== selectedRoute?.id)
              .map((r) => {
                const pts = r.geometry
                  .map(([lt, lg]) => {
                    const p = project(lt, lg);
                    return `${p.x},${p.y}`;
                  })
                  .join(' ');
                return (
                  <Polyline
                    key={`alt-svg-${r.id}`}
                    points={pts}
                    fill="none"
                    stroke={isDarkMode ? '#155e4b' : '#9ca3af'}
                    strokeWidth="3"
                    strokeDasharray="4,5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

          {/* Main Selected Route Outer Glow */}
          {polylinePoints.length > 0 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke="url(#safeRouteGlow)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Main Selected Route Path with Hover Tooltip */}
          {polylinePoints.length > 0 && (
            <G
              {...({
                onMouseEnter: () => {
                  setHovered({
                    title: `Selected Path: ${selectedRoute?.title || 'Safest Route'}`,
                    subtitle: `Safety Score: ${selectedRoute?.safety_score ?? 88}/100 • Distance: ${(
                      (selectedRoute?.distance_m || 3000) / 1000
                    ).toFixed(1)} km`,
                    badge: 'VERIFIED ROUTE',
                    badgeColor: colors.safe,
                    x: 200,
                    y: 180,
                  });
                },
                onMouseLeave: () => setHovered(null),
              } as any)}
            >
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke={selectedRoute?.id === 'fastest' ? colors.caution : colors.safe}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          )}

          {/* Travelled Path Trail while In Transit */}
          {isTripActive && trailPoints.length > 0 && (
            <Polyline
              points={trailPoints}
              fill="none"
              stroke={colors.signal}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Safe Havens Layer (Police, Hospitals, Chemist) on SVG */}
          {showSafeHavens &&
            delhiSafeHavens.map((h, i) => {
              const p = project(h.lat, h.lng);
              return (
                <G
                  key={`haven-svg-${i}`}
                  onMouseEnter={() => {
                    setHovered({
                      title: h.name,
                      subtitle: `${h.type === 'police' ? 'Delhi Police Station' : '24/7 Emergency Hospital'} • Safe Haven`,
                      badge: 'SAFE HAVEN',
                      badgeColor: colors.safe,
                      x: p.x,
                      y: p.y,
                    });
                  }}
                  onMouseLeave={() => setHovered(null)}
                >
                  <Circle cx={p.x} cy={p.y} r={10} fill="rgba(34, 197, 94, 0.25)" />
                  <Circle cx={p.x} cy={p.y} r={6} fill={colors.safe} stroke="#ffffff" strokeWidth="1.5" />
                </G>
              );
            })}

          {/* Incident Reports Layer on SVG */}
          {reports.map((rep, i) => {
            const p = project(rep.lat, rep.lng);
            const isDanger = rep.severity >= 3;
            return (
              <G
                key={`report-svg-${i}`}
                onMouseEnter={() => {
                  setHovered({
                    title: rep.address_label || 'Reported Hazard Spot',
                    subtitle: `${rep.category.replace('_', ' ')} • Severity ${rep.severity}/3 (${rep.confirmations_count} verifications)`,
                    badge: isDanger ? 'HIGH RISK' : 'COMMUNITY REPORT',
                    badgeColor: isDanger ? colors.danger : colors.caution,
                    x: p.x,
                    y: p.y,
                  });
                }}
                onMouseLeave={() => setHovered(null)}
              >
                <Circle cx={p.x} cy={p.y} r={12} fill={isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.25)'} />
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill={isDanger ? colors.danger : colors.caution}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </G>
            );
          })}

          {/* Weakest Stretch Marker on SVG */}
          {selectedRoute?.weakest_stretch && (
            <G
              onMouseEnter={() => {
                const ws = selectedRoute.weakest_stretch;
                const p = ws ? project(ws.start_lat, ws.start_lng) : { x: 200, y: 200 };
                setHovered({
                  title: 'Weakest Route Stretch',
                  subtitle: selectedRoute.weakest_stretch?.reason || 'Dim lighting or isolated stretch',
                  badge: 'CAUTION ZONE',
                  badgeColor: colors.caution,
                  x: p.x,
                  y: p.y,
                });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              {(() => {
                const ws = selectedRoute.weakest_stretch;
                const p = ws ? project(ws.start_lat, ws.start_lng) : { x: 200, y: 200 };
                return (
                  <>
                    <Circle cx={p.x} cy={p.y} r={12} fill="rgba(245, 158, 11, 0.35)" />
                    <Circle cx={p.x} cy={p.y} r={6} fill={colors.caution} stroke="#ffffff" strokeWidth="2" />
                  </>
                );
              })()}
            </G>
          )}

          {/* Origin / Start Pin on SVG */}
          <G
            onMouseEnter={() => {
              setHovered({
                title: `Start: ${origin?.name || 'Origin'}`,
                subtitle: `GPS: ${origin?.lat.toFixed(4)}°N, ${origin?.lng.toFixed(4)}°E`,
                badge: 'START POINT',
                badgeColor: colors.safe,
                x: startPt.x,
                y: startPt.y,
              });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <Circle cx={startPt.x} cy={startPt.y} r={13} fill="rgba(34, 197, 94, 0.3)" />
            <Circle cx={startPt.x} cy={startPt.y} r={9} fill={colors.safe} stroke="#ffffff" strokeWidth="2.5" />
            <Circle cx={startPt.x} cy={startPt.y} r={3.5} fill="#ffffff" />
          </G>

          {/* Destination Pin on SVG */}
          <G
            onMouseEnter={() => {
              setHovered({
                title: `Destination: ${destination?.name || 'Destination'}`,
                subtitle: `ETA: ${Math.ceil((selectedRoute?.duration_s || 1200) / 60)} mins`,
                badge: 'DESTINATION',
                badgeColor: colors.danger,
                x: destPt.x,
                y: destPt.y,
              });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <Circle cx={destPt.x} cy={destPt.y} r={14} fill="rgba(239, 68, 68, 0.3)" />
            <Circle cx={destPt.x} cy={destPt.y} r={9.5} fill={colors.danger} stroke="#ffffff" strokeWidth="2.5" />
            <Circle cx={destPt.x} cy={destPt.y} r={3.5} fill="#ffffff" />
          </G>

          {/* Live Moving User Dot (Current Location projected on path) */}
          <G
            onMouseEnter={() => {
              setHovered({
                title: isSos ? 'EMERGENCY SOS ACTIVE' : isTripActive ? 'You (Travelling)' : 'Your GPS Location',
                subtitle: `Speed: ${(currentSpeed * 3.6).toFixed(1)} km/h • GPS (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)})`,
                badge: isSos ? 'ALERT' : 'LIVE BEACON',
                badgeColor: isSos ? colors.danger : colors.signal,
                x: currPt.x,
                y: currPt.y,
              });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <Circle
              cx={currPt.x}
              cy={currPt.y}
              r={isSos ? 24 : 18}
              fill="none"
              stroke={isSos ? colors.danger : colors.signal}
              strokeWidth="2.5"
              opacity="0.5"
            />
            <Circle
              cx={currPt.x}
              cy={currPt.y}
              r={8}
              fill={isSos ? colors.danger : colors.signal}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          </G>
        </G>
      </Svg>

      {/* Floating Interactive Hover Tooltip Card */}
      {hovered && (
        <View
          style={[
            styles.tooltipCard,
            {
              backgroundColor: colors.surface,
              borderColor: hovered.badgeColor || colors.signal,
              // Position near center or clamp within view
              top: Math.max(16, Math.min(280, hovered.y - 65)),
              left: Math.max(16, Math.min(220, hovered.x - 70)),
            },
          ]}
        >
          {hovered.badge ? (
            <View style={[styles.tooltipBadge, { backgroundColor: hovered.badgeColor || colors.signal }]}>
              <Text style={styles.tooltipBadgeText}>{hovered.badge}</Text>
            </View>
          ) : null}
          <Text style={[styles.tooltipTitle, { color: colors.ink }]} numberOfLines={1}>
            {hovered.title}
          </Text>
          {hovered.subtitle ? (
            <Text style={[styles.tooltipSub, { color: colors.muted }]} numberOfLines={2}>
              {hovered.subtitle}
            </Text>
          ) : null}
        </View>
      )}

      {/* Floating Zoom & Pan Control Pad (Mouse Scroll & Buttons) */}
      <View style={[styles.zoomControlPad, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <TouchableOpacity
          onPress={handleZoomIn}
          style={[styles.zoomBtn, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}
          accessibilityLabel="Zoom In"
        >
          <Plus size={16} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleZoomOut}
          style={[styles.zoomBtn, { borderBottomColor: colors.line, borderBottomWidth: 1 }]}
          accessibilityLabel="Zoom Out"
        >
          <Minus size={16} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResetView}
          style={styles.zoomBtn}
          accessibilityLabel="Reset Map View"
        >
          <RotateCcw size={14} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Zoom / Mouse Scroll Helper Badge */}
      <View style={[styles.mapHelpPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
        <Info size={11} color={colors.muted} />
        <Text style={[styles.mapHelpText, { color: colors.muted }]}>
          Scroll wheel to zoom • Drag to pan • Hover pins for details ({Math.round(zoom * 100)}%)
        </Text>
      </View>

      {/* Start Waypoint Callout Pill */}
      {origin && (
        <View style={[styles.canvasWaypointPill, { top: 12, left: 14, borderColor: colors.safe, backgroundColor: colors.surface }]}>
          <View style={[styles.waypointDot, { backgroundColor: colors.safe }]} />
          <Text style={[styles.waypointText, { color: colors.ink }]} numberOfLines={1}>
            From: {origin.name}
          </Text>
        </View>
      )}

      {/* Destination Waypoint Callout Pill */}
      {destination && (
        <View style={[styles.canvasWaypointPill, { top: 44, left: 14, borderColor: colors.danger, backgroundColor: colors.surface }]}>
          <View style={[styles.waypointDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.waypointText, { color: colors.ink }]} numberOfLines={1}>
            To: {destination.name}
          </Text>
        </View>
      )}

      {/* Real-time Travelling Navigation HUD Bar on Map */}
      {isTripActive && (
        <View style={[styles.liveTravelOverlay, { backgroundColor: colors.surface, borderColor: colors.signal }]}>
          <View style={styles.liveTravelRow}>
            <View style={[styles.gpsDot, { backgroundColor: colors.signal }]} />
            <Text style={[styles.liveTravelTitle, { color: colors.signal }]}>TRAVELLING ALONG SAFE CORRIDOR</Text>
            <View style={[styles.speedTag, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.speedTagText, { color: colors.ink }]}>
                {(currentSpeed * 3.6).toFixed(1)} km/h
              </Text>
            </View>
          </View>
          <Text style={[styles.liveTravelCoords, { color: colors.muted }]}>
            GPS: {currentLocation.lat.toFixed(4)}°N, {currentLocation.lng.toFixed(4)}°E
          </Text>
        </View>
      )}

      {/* Floating GPS Button */}
      {onLocateMe && (
        <TouchableOpacity
          onPress={onLocateMe}
          style={[
            styles.gpsFab,
            {
              backgroundColor: isGpsTracking ? colors.signal : colors.surface,
              borderColor: isGpsTracking ? colors.signal : colors.line,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Center on GPS location"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={isGpsTracking ? '#ffffff' : colors.signal} />
          ) : isGpsTracking ? (
            <LocateFixed size={20} color="#ffffff" />
          ) : (
            <Locate size={20} color={colors.ink} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  } as any,
  liveMarkerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  originMarkerPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  originMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  destMarkerPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  weakStretchPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  poiBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  mapGridPattern: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delhiRingRoad: {
    width: '92%',
    height: '75%',
    borderRadius: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  delhiInnerRing: {
    position: 'absolute',
    width: '50%',
    height: '40%',
    borderRadius: 120,
    borderWidth: 1.5,
  },
  gpsFab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 90,
  },
  travellingNavPill: {
    position: 'absolute',
    top: 14,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 80,
  },
  travellingNavText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  canvasWaypointPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 220,
    zIndex: 60,
  },
  waypointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waypointText: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveTravelOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveTravelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveTravelTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  speedTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  speedTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveTravelCoords: {
    fontSize: 10,
    marginTop: 2,
  },
  zoomControlPad: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 85,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHelpPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 70,
  },
  mapHelpText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tooltipCard: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    maxWidth: 240,
    zIndex: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    pointerEvents: 'none' as any,
  },
  tooltipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  tooltipBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipSub: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
});
