Feature: Create Video Upload
  As a user
  I want to initiate a video upload
  So that I can get a presigned S3 URL

  Scenario: Successfully initiate a video upload
    Given I have a valid file name "meu-treino.mp4" and a user ID "user-123"
    When I request to create a video upload
    Then a new video should be saved in the database
    And a presigned URL should be returned

  Scenario: Storage gateway fails to generate URL
    Given I have a valid file name "falha.mp4" and a user ID "user-123"
    And the storage gateway is unavailable
    When I request to create a video upload
    Then the operation should fail with an error message