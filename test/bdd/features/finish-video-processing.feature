Feature: Finish Video Processing
  As the system
  I want to register the outcome of a video processing
  So that the user can be notified via email

  Scenario: Processing finished successfully
    Given an existing video in processing state with ID "video-123"
    When the finish process is executed with success and a ZIP key "zip/123.zip"
    Then the video status should be updated to DONE
    And an email notification message should be queued

  Scenario: Processing failed
    Given an existing video in processing state with ID "video-123"
    When the finish process is executed with failure and an error message
    Then the video status should be updated to ERROR
    And an email notification message should be queued