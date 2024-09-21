WebRTC API

WebRTC (Web Real-Time Communication) is a technology that enables Web applications and sites to capture and optionally stream audio and/or video media, as well as to exchange arbitrary data between browsers without requiring an intermediary. The set of standards that comprise WebRTC makes it possible to share data and perform teleconferencing peer-to-peer, without requiring that the user install plug-ins or any other third-party software.

WebRTC consists of several interrelated APIs and protocols which work together to achieve this. The documentation you'll find here will help you understand the fundamentals of WebRTC, how to set up and use both data and media connections, and more.
WebRTC concepts and usage

WebRTC serves multiple purposes; together with the Media Capture and Streams API, they provide powerful multimedia capabilities to the Web, including support for audio and video conferencing, file exchange, screen sharing, identity management, and interfacing with legacy telephone systems including support for sending DTMF (touch-tone dialing) signals. Connections between peers can be made without requiring any special drivers or plug-ins, and can often be made without any intermediary servers.

Connections between two peers are represented by the RTCPeerConnection interface. Once a connection has been established and opened using RTCPeerConnection, media streams (MediaStreams) and/or data channels (RTCDataChannels) can be added to the connection.

Media streams can consist of any number of tracks of media information; tracks, which are represented by objects based on the MediaStreamTrack interface, may contain one of a number of types of media data, including audio, video, and text (such as subtitles or even chapter names). Most streams consist of at least one audio track and likely also a video track, and can be used to send and receive both live media or stored media information (such as a streamed movie).

You can also use the connection between two peers to exchange arbitrary binary data using the RTCDataChannel interface. This can be used for back-channel information, metadata exchange, game status packets, file transfers, or even as a primary channel for data transfer.
Interoperability

WebRTC is in general well supported in modern browsers, but some incompatibilities remain. The adapter.js library is a shim to insulate apps from these incompatibilities.
WebRTC reference

Because WebRTC provides interfaces that work together to accomplish a variety of tasks, we have divided up the reference by category. Please see the sidebar for an alphabetical list.
Connection setup and management

These interfaces, dictionaries, and types are used to set up, open, and manage WebRTC connections. Included are interfaces representing peer media connections, data channels, and interfaces used when exchanging information on the capabilities of each peer in order to select the best possible configuration for a two-way media connection.
Interfaces

RTCPeerConnection

    Represents a WebRTC connection between the local computer and a remote peer. It is used to handle efficient streaming of data between the two peers.
RTCDataChannel

    Represents a bi-directional data channel between two peers of a connection.
RTCDataChannelEvent

    Represents events that occur while attaching a RTCDataChannel to a RTCPeerConnection. The only event sent with this interface is datachannel.
RTCSessionDescription

    Represents the parameters of a session. Each RTCSessionDescription consists of a description type indicating which part of the offer/answer negotiation process it describes and of the SDP descriptor of the session.
RTCStatsReport

    Provides information detailing statistics for a connection or for an individual track on the connection; the report can be obtained by calling RTCPeerConnection.getStats().
RTCIceCandidate

    Represents a candidate Interactive Connectivity Establishment (ICE) server for establishing an RTCPeerConnection.
RTCIceTransport

    Represents information about an ICE transport.
RTCPeerConnectionIceEvent

    Represents events that occur in relation to ICE candidates with the target, usually an RTCPeerConnection. Only one event is of this type: icecandidate.
RTCRtpSender

    Manages the encoding and transmission of data for a MediaStreamTrack on an RTCPeerConnection.
RTCRtpReceiver

    Manages the reception and decoding of data for a MediaStreamTrack on an RTCPeerConnection.
RTCTrackEvent

    The interface used to represent a track event, which indicates that an RTCRtpReceiver object was added to the RTCPeerConnection object, indicating that a new incoming MediaStreamTrack was created and added to the RTCPeerConnection.
RTCSctpTransport

    Provides information which describes a Stream Control Transmission Protocol (SCTP) transport and also provides a way to access the underlying Datagram Transport Layer Security (DTLS) transport over which SCTP packets for all of an RTCPeerConnection's data channels are sent and received.

Events

bufferedamountlow

    The amount of data currently buffered by the data channel—as indicated by its bufferedAmount property—has decreased to be at or below the channel's minimum buffered data size, as specified by bufferedAmountLowThreshold.
close

    The data channel has completed the closing process and is now in the closed state. Its underlying data transport is completely closed at this point. You can be notified before closing completes by watching for the closing event instead.
closing

    The RTCDataChannel has transitioned to the closing state, indicating that it will be closed soon. You can detect the completion of the closing process by watching for the close event.
connectionstatechange

    The connection's state, which can be accessed in connectionState, has changed.
datachannel

    A new RTCDataChannel is available following the remote peer opening a new data channel. This event's type is RTCDataChannelEvent.
error

    An RTCErrorEvent indicating that an error occurred on the data channel.
error

    An RTCErrorEvent indicating that an error occurred on the RTCDtlsTransport. This error will be either dtls-failure or fingerprint-failure.
gatheringstatechange

    The RTCIceTransport's gathering state has changed.
icecandidate

    An RTCPeerConnectionIceEvent which is sent whenever the local device has identified a new ICE candidate which needs to be added to the local peer by calling setLocalDescription().
icecandidateerror

    An RTCPeerConnectionIceErrorEvent indicating that an error has occurred while gathering ICE candidates.
iceconnectionstatechange

    Sent to an RTCPeerConnection when its ICE connection's state—found in the iceconnectionstate property—changes.
icegatheringstatechange

    Sent to an RTCPeerConnection when its ICE gathering state—found in the icegatheringstate property—changes.
message

    A message has been received on the data channel. The event is of type MessageEvent.
negotiationneeded

    Informs the RTCPeerConnection that it needs to perform session negotiation by calling createOffer() followed by setLocalDescription().
open

    The underlying data transport for the RTCDataChannel has been successfully opened or re-opened.
selectedcandidatepairchange

    The currently-selected pair of ICE candidates has changed for the RTCIceTransport on which the event is fired.
track

    The track event, of type RTCTrackevent is sent to an RTCPeerConnection when a new track is added to the connection following the successful negotiation of the media's streaming.
signalingstatechange

    Sent to the peer connection when its signalingstate has changed. This happens as a result of a call to either setLocalDescription() or setRemoteDescription().
statechange

    The state of the RTCDtlsTransport has changed.
statechange

    The state of the RTCIceTransport has changed.
statechange

    The state of the RTCSctpTransport has changed.
rtctransform

    An encoded video or audio frame is ready to process using a transform stream in a worker.

Types

RTCSctpTransport.state

    Indicates the state of an RTCSctpTransport instance.

Identity and security

These APIs are used to manage user identity and security, in order to authenticate the user for a connection.

RTCIdentityProvider

    Enables a user agent is able to request that an identity assertion be generated or validated.
RTCIdentityAssertion

    Represents the identity of the remote peer of the current connection. If no peer has yet been set and verified this interface returns null. Once set it can't be changed.
RTCIdentityProviderRegistrar

    Registers an identity provider (idP).
RTCCertificate

    Represents a certificate that an RTCPeerConnection uses to authenticate.

Telephony

These interfaces and events are related to interactivity with Public-Switched Telephone Networks (PSTNs). They're primarily used to send tone dialing sounds—or packets representing those tones—across the network to the remote peer.
Interfaces

RTCDTMFSender

    Manages the encoding and transmission of Dual-Tone Multi-Frequency (DTMF) signaling for an RTCPeerConnection.
RTCDTMFToneChangeEvent

    Used by the tonechange event to indicate that a DTMF tone has either begun or ended. This event does not bubble (except where otherwise stated) and is not cancelable (except where otherwise stated).

Events

tonechange

    Either a new DTMF tone has begun to play over the connection, or the last tone in the RTCDTMFSender's toneBuffer has been sent and the buffer is now empty. The event's type is RTCDTMFToneChangeEvent.

Encoded Transforms

These interfaces and events are used to process incoming and outgoing encoded video and audio frames using a transform stream running in a worker.
Interfaces

RTCRtpScriptTransform

    An interface for inserting transform stream(s) running in a worker into the RTC pipeline.
RTCRtpScriptTransformer

    The worker-side counterpart of an RTCRtpScriptTransform that passes options from the main thread, along with a readable stream and writeable stream that can be used to pipe encoded frames through a TransformStream.
RTCEncodedVideoFrame

    Represents an encoded video frame to be transformed in the RTC pipeline.
RTCEncodedAudioFrame

    Represents an encoded audio frame to be transformed in the RTC pipeline.

Properties

RTCRtpReceiver.transform

    A property used to insert a transform stream into the receiver pipeline for incoming encoded video and audio frames.
RTCRtpSender.transform

    A property used to insert a transform stream into the sender pipeline for outgoing encoded video and audio frames.

Events

rtctransform

    An RTC transform is ready to run in the worker, or an encoded video or audio frame is ready to process.

Guides

Introduction to WebRTC protocols

    This article introduces the protocols on top of which the WebRTC API is built.
WebRTC connectivity

    A guide to how WebRTC connections work and how the various protocols and interfaces can be used together to build powerful communication apps.
Lifetime of a WebRTC session

    WebRTC lets you build peer-to-peer communication of arbitrary data, audio, or video—or any combination thereof—into a browser application. In this article, we'll look at the lifetime of a WebRTC session, from establishing the connection all the way through closing the connection when it's no longer needed.
Establishing a connection: The perfect negotiation pattern

    Perfect negotiation is a design pattern which is recommended for your signaling process to follow, which provides transparency in negotiation while allowing both sides to be either the offerer or the answerer, without significant coding needed to differentiate the two.
Signaling and two-way video calling

    A tutorial and example which turns a WebSocket-based chat system created for a previous example and adds support for opening video calls among participants. The chat server's WebSocket connection is used for WebRTC signaling.
Codecs used by WebRTC

    A guide to the codecs which WebRTC requires browsers to support as well as the optional ones supported by various popular browsers. Included is a guide to help you choose the best codecs for your needs.
Using WebRTC data channels

    This guide covers how you can use a peer connection and an associated RTCDataChannel to exchange arbitrary data between two peers.
Using DTMF with WebRTC

    WebRTC's support for interacting with gateways that link to old-school telephone systems includes support for sending DTMF tones using the RTCDTMFSender interface. This guide shows how to do so.
Using WebRTC Encoded Transforms

    This guide shows how a web application can modify incoming and outgoing WebRTC encoded video and audio frames, using a TransformStream running into a worker.

Tutorials

Improving compatibility using WebRTC adapter.js

    The WebRTC organization provides on GitHub the WebRTC adapter to work around compatibility issues in different browsers' WebRTC implementations. The adapter is a JavaScript shim which lets your code to be written to the specification so that it will "just work" in all browsers with WebRTC support.
A simple RTCDataChannel sample

    The RTCDataChannel interface is a feature which lets you open a channel between two peers over which you may send and receive arbitrary data. The API is intentionally similar to the WebSocket API, so that the same programming model can be used for each.
Building an internet connected phone with Peer.js

    This tutorial is a step-by-step guide on how to build a phone using Peer.js

Specifications
Specification
WebRTC: Real-Time Communication in Browsers
Media Capture and Streams
Media Capture from DOM Elements
WebRTC-proper protocols

    Application Layer Protocol Negotiation for Web Real-Time Communications
    WebRTC Audio Codec and Processing Requirements
    RTCWeb Data Channels
    RTCWeb Data Channel Protocol
    Web Real-Time Communication (WebRTC): Media Transport and Use of RTP
    WebRTC Security Architecture
    Transports for RTCWEB

Related supporting protocols

    Interactive Connectivity Establishment (ICE): A Protocol for Network Address Translator (NAT) Traversal for Offer/Answer Protocol
    Session Traversal Utilities for NAT (STUN)
    URI Scheme for the Session Traversal Utilities for NAT (STUN) Protocol
    Traversal Using Relays around NAT (TURN) Uniform Resource Identifiers
    An Offer/Answer Model with Session Description Protocol (SDP)
    Session Traversal Utilities for NAT (STUN) Extension for Third Party Authorization

See also

    MediaDevices
    MediaStreamEvent
    MediaStreamTrack
    MessageEvent
    MediaStream
    Media Capture and Streams API
    Firefox multistream and renegotiation for Jitsi Videobridge
    Peering Through the WebRTC Fog with SocketPeer
    Inside the Party Bus: Building a Web App with Multiple Live Video Streams + Interactive Graphics
    Web media technologies
