Feature: Start Video Processing
  As the system
  I want to start the processing of a raw video
  So that a worker can extract frames and create a ZIP

  Scenario: Successfully start processing
    Given an existing video with ID "video-123"
    When the start video processing is executed
    Then the video status should be updated to PROCESSING
    And a message should be sent to the processing queue

  Scenario: Video not found
    Given a non-existent video ID "999"
    When the start video processing is executed
    Then the operation should fail indicating the video was not found