import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DIDDocument } from '@/extensions/identities/types';

/**
 * Structured renderer for a W3C DID Document — fields broken out by
 * section (`@context`, `id`, `verificationMethod`, `authentication`,
 * `assertionMethod`, `service`) instead of a raw JSON dump.
 *
 * Used by both the legacy in-place "View Doc" modal and the
 * `/identity-details` screen so the two views are pixel-identical.
 */
export interface DidDocumentViewProps {
  didDocument: DIDDocument | undefined;
}

export function DidDocumentView({ didDocument }: DidDocumentViewProps): React.JSX.Element {
  if (!didDocument) {
    return <Text style={styles.noDocText}>No DID Document available</Text>;
  }

  return (
    <View>
      <Text style={styles.docLabel}>@context:</Text>
      {didDocument['@context'].map((ctx, index) => (
        <Text key={index} style={styles.docValue}>
          {ctx}
        </Text>
      ))}

      <Text style={styles.docLabel}>id:</Text>
      <Text style={styles.docValue}>{didDocument.id}</Text>

      <Text style={styles.docLabel}>verificationMethod:</Text>
      {didDocument.verificationMethod.map((method, index) => (
        <View key={index} style={styles.verificationMethod}>
          <Text style={styles.docSubLabel}> id: {method.id}</Text>
          <Text style={styles.docSubLabel}> type: {method.type}</Text>
          <Text style={styles.docSubLabel}> controller: {method.controller}</Text>
          <Text style={styles.docSubLabel}>
            {' '}
            publicKeyMultibase: {method.publicKeyMultibase}
          </Text>
        </View>
      ))}

      <Text style={styles.docLabel}>authentication:</Text>
      {didDocument.authentication.map((auth, index) => (
        <Text key={index} style={styles.docValue}>
          {auth}
        </Text>
      ))}

      <Text style={styles.docLabel}>assertionMethod:</Text>
      {didDocument.assertionMethod.map((method, index) => (
        <Text key={index} style={styles.docValue}>
          {method}
        </Text>
      ))}

      <Text style={styles.docLabel}>service:</Text>
      {didDocument.service?.map((svc, index) => (
        <View key={index} style={styles.serviceSection}>
          <Text style={styles.docSubLabel}> id: {svc.id}</Text>
          <Text style={styles.docSubLabel}> type: {svc.type}</Text>
          <Text style={styles.docSubLabel}> iceServers:</Text>
          <View style={styles.endpointContainer}>
            {svc.iceServers.map((iceServer, idx) => (
              <View key={`ice-${idx}`}>
                <Text style={styles.endpointLabel}> - urls:</Text>
                {Array.isArray(iceServer.urls) ? (
                  iceServer.urls.map((url, urlIdx) => (
                    <Text key={`url-${urlIdx}`} style={styles.endpointValue}>
                      {' '}
                      - {url}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.endpointValue}> - {iceServer.urls}</Text>
                )}
                {iceServer.username && (
                  <Text style={styles.endpointValue}> username: {iceServer.username}</Text>
                )}
                {iceServer.credential && (
                  <Text style={styles.endpointValue}> credential: ***</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  docValue: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  docSubLabel: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  verificationMethod: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  serviceSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  endpointContainer: {
    marginTop: 4,
  },
  endpointLabel: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'monospace',
    marginLeft: 16,
    marginTop: 4,
  },
  endpointValue: {
    fontSize: 11,
    color: '#15803D',
    fontFamily: 'monospace',
    marginLeft: 24,
    marginBottom: 2,
  },
  noDocText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DidDocumentView;
